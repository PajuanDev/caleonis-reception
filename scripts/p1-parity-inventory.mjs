import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(root, 'docs/p1');
const raw = join(root, '.tmp/p1-reprise');
const mode = process.argv[2] ?? 'build';
const require = createRequire(join(root, 'apps/landing/package.json'));
const { parse } = require('parse5');
const normalize = p => !p || p === '/' ? '/' : `/${p.replace(/^\/+|\/+$/g, '')}/`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const attr = (n, name) => n.attrs?.find(a => a.name === name)?.value;
function inspect(html) {
  const nodes = [];
  const walk = n => { nodes.push(n); (n.childNodes ?? []).forEach(walk); };
  walk(parse(html));
  const textOf = n => (n.childNodes ?? []).map(c => c.value ?? textOf(c)).join('');
  return {
    title: textOf(nodes.find(n => n.tagName === 'title') ?? {}),
    headings: nodes.filter(n => /^h[1-3]$/.test(n.tagName)).map(n => ({level: n.tagName, text: textOf(n).trim(), id: attr(n,'id')})),
    canonical: nodes.filter(n => n.tagName === 'link' && attr(n,'rel') === 'canonical').map(n=>attr(n,'href')),
    hreflang: nodes.filter(n => n.tagName === 'link' && attr(n,'hreflang')).map(n=>({lang:attr(n,'hreflang'),href:attr(n,'href')})),
    assets: [...new Set(nodes.flatMap(n => ['src','poster'].map(k => attr(n,k))).filter(Boolean))].sort(),
    actions: nodes.filter(n => n.tagName === 'a' && attr(n,'href')).map(n=>({href:attr(n,'href'),text:textOf(n).trim().slice(0,160)})),
    buttons: nodes.filter(n=>n.tagName === 'button').map(n=>textOf(n).trim()),
    ids: nodes.flatMap(n => attr(n,'id') ? [attr(n,'id')] : []),
    placeholder: /Contenu en cours de relecture|Content under review/.test(html),
  };
}
await mkdir(evidence,{recursive:true}); await mkdir(raw,{recursive:true});
async function get(url) {
  try { const r=await fetch(url,{signal:AbortSignal.timeout(20000)}); const html=await r.text(); return {url,finalUrl:r.url,status:r.status,sha256:sha(html),html}; }
  catch(e) { return {url,status:null,error:String(e)}; }
}
async function sitemap(url, seen=new Set()) {
  if(seen.has(url)) return []; seen.add(url);
  const r=await get(url); if(r.status !== 200) throw new Error(`Sitemap unavailable ${url}: ${r.status} ${r.error??''}`);
  const urls=[...r.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
  if(r.html.includes('<sitemapindex')) return (await Promise.all(urls.map(u=>sitemap(u,seen)))).flat();
  return urls;
}
if(mode === 'source') {
  const sites=await Promise.all([sitemap('https://lobbystack.com/sitemap-index.xml'),sitemap('https://docs.lobbystack.com/sitemap.xml')]);
  const combined=sites.flat();
  const excluded=combined.filter(u=>/^\/(es|sr)(\/|$)/.test(new URL(u).pathname));
  const urls=[...new Set([...combined.filter(u=>!excluded.includes(u)), 'https://app.lobbystack.com/fr/login','https://app.lobbystack.com/fr/signup'])].sort();
  const pages=[];
  for(let offset=0;offset<urls.length;offset+=6) {
    const batch=await Promise.all(urls.slice(offset,offset+6).map(get));
    for(const p of batch) { const {html,...meta}=p; pages.push({...meta,...(html?inspect(html):{})}); }
    console.log(`Source ${Math.min(offset+6,urls.length)}/${urls.length}`);
  }
  const data={checkedAt:new Date().toISOString(),scope:'Public sitemap FR/EN + docs + observed auth URLs. es/sr outside requested locale scope.',sitemaps:['https://lobbystack.com/sitemap-index.xml','https://docs.lobbystack.com/sitemap.xml'],excludedLocales:excluded,pages};
  await writeFile(join(evidence,'public-source-inventory.json'),JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({pages:pages.length,excludedLocales:excluded.length,unavailable:pages.filter(p=>p.status!==200).map(p=>({url:p.url,status:p.status,error:p.error}))},null,2));
} else {
  const source=JSON.parse(await readFile(join(evidence,'public-source-inventory.json'),'utf8'));
  const dist=resolve(process.argv[3] ?? join(root,'apps/landing/dist'));
  const files=(await readdir(dist,{recursive:true})).filter(f=>f.endsWith('.html'));
  const built=new Map();
  for(const f of files) { const html=await readFile(join(dist,f),'utf8');built.set(normalize(f.replaceAll('\\','/').replace(/(?:\/)?index\.html$/,'').replace(/\.html$/,'')),{file:f,sha256:sha(html),...inspect(html)}); }
  const captureFile=join(raw,'captures.json');
  const captures=await readFile(captureFile,'utf8').then(JSON.parse).catch(()=>[]);
  const http=await readFile(join(raw,'http-status.json'),'utf8').then(JSON.parse).catch(()=>({result:[]}));
  const allRoutes=new Set([...built.keys()]);
  const sourceByRoute=new Map();
  for(const p of source.pages) {
    const u=new URL(p.url); const path=normalize(u.pathname);
    const route=u.host==='docs.lobbystack.com'?normalize(u.pathname.startsWith('/fr/')?'/aide'+u.pathname.slice(3):'/aide/en'+u.pathname):u.host==='app.lobbystack.com'?'/'+(path.includes('signup')?'signup/':'login/'):path;
    sourceByRoute.set(route,p); allRoutes.add(route);
  }
  const routes=[]; const failures=[];
  for(const route of [...allRoutes].sort()) {
    const upstream=sourceByRoute.get(route); const candidate=built.get(route);
    const auth=/^\/(login|signup)\/$/.test(route);
    const reason=auth?'App auth served by existing Next runtime; isolated static preview links to app. Combined staging qualification pending.':!candidate?'Missing candidate route; no generic HTTP 200 substitute.':candidate.placeholder?'Candidate is still a notice; parity not acquired.':!upstream?'Caléonis addition or fork route absent from current public sitemap.':route.includes('/privacy/')||route.includes('/terms/')||route.includes('/cookie-policy/')?'French operator legal text requires approval; upstream US/CA terms cannot represent the EI.':null;
    if(upstream && !candidate && !auth) failures.push(`${route}: missing source route`);
    if(candidate?.placeholder) failures.push(`${route}: placeholder`);
    const evidenceFor=(kind,mobile)=>captures.filter(c=>c.kind===kind&&c.route===route&&(mobile?c.viewport.width===390:c.viewport.width>=1000));
    routes.push({sourceRoute:upstream?.url??null,caleonisRoute:'https://receptionist.caleonis.com'+route,route,sourceStatus:upstream?.status??null,sourceTitle:upstream?.title??null,candidateTitle:candidate?.title??null,buildFile:candidate?.file??null,buildSha256:candidate?.sha256??null,sourceHeadings:upstream?.headings??[],candidateHeadings:candidate?.headings??[],buildPresent:Boolean(candidate),inferredStaticStatus:candidate?(route.includes('404')?404:200):auth?null:404,candidateStatus:http.result.find(r=>r.route===route)?.status??null,httpEvidence: http.result.some(r=>r.route===route)?{base:http.base,checkedAt:http.checkedAt,environment:http.environment}:null,status:reason?'EXCEPTION':'IMPLEMENTED_UNQUALIFIED',exception:reason,sourceAssets:upstream?.assets??[],candidateAssets:candidate?.assets??[],actions:candidate?.actions??[],buttons:candidate?.buttons??[],canonical:candidate?.canonical??[],hreflang:candidate?.hreflang??[],sourceDesktop:evidenceFor('source',false),sourceMobile:evidenceFor('source',true),candidateDesktop:evidenceFor('candidate',false),candidateMobile:evidenceFor('candidate',true)});
  }
  const base='e8e23bae4955f64fa3f99cb525faad908439077e';
  const isAsset=f=>/\.(png|jpe?g|webp|gif|svg|woff2?|avif|ico)$/i.test(f);
  const original=execFileSync('git',['ls-tree','-r','--name-only',base,'apps/landing/public','apps/landing/src/assets','mintlify'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(isAsset);
  const current=[];
  for(const folder of ['apps/landing/public','apps/landing/src/assets','mintlify']) for(const f of await readdir(join(root,folder),{recursive:true}))if(isAsset(f)&&!f.split(/[\\/]/).includes('node_modules'))current.push(folder+'/'+f.replaceAll('\\','/'));
  const assets=[];
  for(const path of [...new Set([...original,...current])].sort()) {
    const originalBytes=original.includes(path)?execFileSync('git',['show',`${base}:${path}`],{cwd:root,maxBuffer:20*1024*1024}):null;
    const currentBytes=await readFile(join(root,path)).catch(()=>null);
    assets.push({path,sourceSha256:originalBytes?sha(originalBytes):null,candidateSha256:currentBytes?sha(currentBytes):null,status:!originalBytes?'ADDED':currentBytes?sha(originalBytes)===sha(currentBytes)?'IDENTICAL':'ADAPTED':'MISSING',licenseEvidence:'See marketing-assets.json and docs-parity.json for per-file origin/exception. Repository MIT LICENSE, Copyright (c) 2026 LobbyStack contributors, is retained; third-party licenses and trademarks require separate review.',referencedBy:routes.filter(r=>r.candidateAssets.some(a=>a.endsWith('/'+path.split('/').at(-1)))).map(r=>r.route)});
  }
  const data={generatedAt:new Date().toISOString(),sourceCheckedAt:source.checkedAt,base,previousPr10:'c054d96dd1d67c2ab57e8b6cacaa041b929bca36',coverage:{source:source.pages.length,candidateBuildPages:built.size,mappedBuildPages:routes.filter(r=>r.sourceRoute&&r.buildPresent).length,missing:failures.length,sourceCaptures:captures.filter(c=>c.kind==='source'&&c.file).length,candidateCaptures:captures.filter(c=>c.kind==='candidate'&&c.file).length,httpMeasured:routes.filter(r=>r.httpEvidence).length},qualification:'Route coverage is not visual or functional parity. PENDING until capture/interaction comparisons and commercial exceptions resolved.',routes,assets,failures};
  await writeFile(join(evidence,'exhaustive-parity-manifest.json'),JSON.stringify(data,null,2)+'\n');
  await writeFile(join(raw,'capture-routes.json'),JSON.stringify(routes.filter(r=>r.buildPresent).map(r=>({route:r.route,source:r.sourceRoute})),null,2));
  console.log(JSON.stringify({coverage:data.coverage,failures},null,2));
  if(failures.length) process.exitCode=1;
}
