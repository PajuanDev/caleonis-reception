import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'apps/landing/package.json'));
const {parse}=require('parse5');
export function localTarget(output, pathname) {
  let decoded; try { decoded=decodeURIComponent(pathname); } catch { return null; }
  const target=resolve(output,'.'+decoded);
  return target===output||target.startsWith(output+sep)?target:null;
}
export function pageInfo(html) {
  const nodes=[]; const walk=n=>{nodes.push(n);(n.childNodes??[]).forEach(walk);};walk(parse(html));
  const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
  const text=n=>(n.childNodes??[]).map(c=>c.value??text(c)).join('');
  return {title:text(nodes.find(n=>n.tagName==='title')??{}).trim(),h1:nodes.filter(n=>n.tagName==='h1').length,lang:attr(nodes.find(n=>n.tagName==='html')??{},'lang'),
    ids:new Set(nodes.flatMap(n=>[attr(n,'id'),n.tagName==='a'?attr(n,'name'):null].filter(Boolean))),
    refs:nodes.flatMap(n=>[
      ...['href','src','poster'].filter(k=>attr(n,k)).map(k=>({tag:n.tagName,kind:k,value:attr(n,k)})),
      ...(attr(n,'srcset')&&!attr(n,'srcset').startsWith('data:')?attr(n,'srcset').split(',').map(s=>({tag:n.tagName,kind:'srcset',value:s.trim().split(/\s+/)[0]})):[]),
      ...[...String(attr(n,'style')??(n.tagName==='style'?text(n):'')).matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)].map(m=>({tag:n.tagName,kind:'css-url',value:m[1]})),
    ]),
    canonical:nodes.filter(n=>n.tagName==='link'&&attr(n,'rel')==='canonical').map(n=>attr(n,'href')),
    hreflang:nodes.filter(n=>n.tagName==='link'&&attr(n,'hreflang')).map(n=>({lang:attr(n,'hreflang'),href:attr(n,'href')})),
    placeholder:/Contenu en cours de relecture|Content under review/.test(html)};
}
export async function verify(output,origin,{seo=true}={}) {
  const files=(await readdir(output,{recursive:true})).filter(f=>f.endsWith('.html'));
  const pages=new Map();const failures=[];const externals=new Set();let refs=0;
  for(const f of files) pages.set(resolve(output,f),pageInfo(await readFile(join(output,f),'utf8')));
  const locate=async pathname=>{
    const target=localTarget(output,pathname);if(!target)return null;
    for(const candidate of [target,join(target,'index.html'),target+'.html']) if(await stat(candidate).then(s=>s.isFile()).catch(()=>false))return candidate;
    return null;
  };
  for(const [file,info] of pages) {
    const route='/'+relative(output,file).replaceAll('\\','/').replace(/index\.html$/,'');
    if(!info.title)failures.push(`${route}: empty title`);
    if(info.h1!==1&&!route.endsWith('/404.html'))failures.push(`${route}: ${info.h1} H1 headings`);
    if(info.placeholder&&!/\/(privacy|terms|cookie-policy)\//.test(route))failures.push(`${route}: generic review placeholder`);
    if(seo&&!route.includes('404')) {
      const allowed=new Set([origin,'https://receptionist.caleonis.com']);
      if(info.canonical.length!==1)failures.push(`${route}: expected one canonical, found ${info.canonical.length}`);
      for(const value of info.canonical) {
        let u;try{u=new URL(value);}catch{failures.push(`${route}: invalid canonical ${value}`);continue;}
        if(!allowed.has(u.origin))failures.push(`${route}: wrong canonical origin ${u.origin}`);
        if(!await locate(u.pathname))failures.push(`${route}: canonical target missing ${u.pathname}`);
        const aliases={'/aide/':'/aide/introduction/','/aide/en/':'/aide/en/introduction/','/fr/confidentialite/':'/fr/privacy/'};
        if(u.pathname.replace(/\/$/,'')!==(aliases[route]??route).replace(/\/$/,''))failures.push(`${route}: canonical path mismatch ${u.pathname}`);
      }
      const languages=new Set();
      for(const alternate of info.hreflang) {
        if(languages.has(alternate.lang))failures.push(`${route}: duplicate hreflang ${alternate.lang}`);languages.add(alternate.lang);
        let u;try{u=new URL(alternate.href);}catch{failures.push(`${route}: invalid hreflang ${alternate.href}`);continue;}
        if(!allowed.has(u.origin))failures.push(`${route}: wrong hreflang origin ${u.origin}`);
        const target=await locate(u.pathname);
        if(!target)failures.push(`${route}: missing hreflang target ${u.pathname}`);
        else if(alternate.lang!=='x-default'&&pages.get(target)?.lang?.split('-')[0]!==alternate.lang)failures.push(`${route}: hreflang language mismatch ${alternate.lang} ${u.pathname}`);
        else if(alternate.lang!=='x-default'&&info.lang&&pages.get(target)&&!pages.get(target).hreflang.some(a=>a.lang===info.lang.split('-')[0]))failures.push(`${route}: nonreciprocal hreflang ${u.pathname}`);
      }
      const counterpart=route.startsWith('/aide/en/')?route.replace('/aide/en/','/aide/'):route.startsWith('/aide/')?route.replace('/aide/','/aide/en/'):route.startsWith('/fr/')?route.slice(3):'/fr'+route;
      if(await locate(counterpart))for(const lang of ['fr','en'])if(!languages.has(lang))failures.push(`${route}: missing ${lang} hreflang despite existing counterpart ${counterpart}`);
    }
    for(const ref of info.refs) {
      if(/^(data:|mailto:|tel:|javascript:)/i.test(ref.value))continue;
      let u;try{u=new URL(ref.value,origin+route);}catch{failures.push(`${route}: invalid ${ref.value}`);continue;}
      if(u.origin!==origin){if(/^https?:/.test(u.protocol))externals.add(u.href);continue;}
      refs++;
      const target=await locate(u.pathname);
      if(!target){failures.push(`${route}: missing ${ref.kind} ${u.pathname}`);continue;}
      if(u.hash&&pages.has(target)) {
        let id;try{id=decodeURIComponent(u.hash.slice(1));}catch{failures.push(`${route}: malformed anchor ${u.hash}`);continue;}
        if(!pages.get(target).ids.has(id))failures.push(`${route}: missing anchor ${u.pathname}${u.hash}`);
      }
    }
  }
  for(const file of (await readdir(output,{recursive:true})).filter(f=>f.endsWith('.css'))) {
    const css=await readFile(join(output,file),'utf8');
    for(const match of css.matchAll(/(?:url\(\s*["']?([^\s"')]+)["']?\s*\)|@import\s+["']([^"']+)["'])/g)) {
      const value=match[1]??match[2];if(value.startsWith('data:'))continue;
      let u;try{u=new URL(value,origin+'/'+file.replaceAll('\\','/'));}catch{failures.push(`${file}: invalid CSS reference ${value}`);continue;}
      if(u.origin===origin&&!await locate(u.pathname))failures.push(`${file}: missing CSS resource ${u.pathname}`);
    }
  }
  return {pages:pages.size,references:refs,externalTargets:[...externals].sort(),failures:[...new Set(failures)]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=await verify(resolve(process.argv[2]??join(root,'apps/landing/dist')),process.env.PREVIEW_ORIGIN??'https://caleonis-receptionist-v1-review.willgosse225.chatgpt.site');
  await mkdir(join(root,'.tmp/p1-reprise'),{recursive:true});
  await writeFile(join(root,'.tmp/p1-reprise/link-contract.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,externalTargets:report.externalTargets.length},null,2));
  if(report.failures.length)process.exitCode=1;
}
