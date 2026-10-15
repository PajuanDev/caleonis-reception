import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const folder=resolve(process.argv[2]??join(root,'.tmp/p1-reprise/browser'));
const require=createRequire(join(root,'apps/landing/package.json'));
const sharp=require('sharp');
const records=JSON.parse(await readFile(join(folder,'captures.json'),'utf8'));
const manifest=JSON.parse(await readFile(join(root,'docs/p1/exhaustive-parity-manifest.json'),'utf8'));
const publicRoutes=new Set(manifest.routes.filter(r=>r.sourceRoute).map(r=>r.route));
const pairs=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
const candidates=new Map(records.filter(r=>r.kind==='candidate'&&r.file).map(r=>[r.route+'|'+r.viewport.width+'|'+r.viewport.height,r]));
for(const candidate of candidates.values()) {
  const source=records.findLast(r=>r.kind==='source'&&r.file&&r.route===candidate.route&&r.viewport.width===candidate.viewport.width&&r.viewport.height===candidate.viewport.height);
  const bytes=await readFile(join(folder,candidate.file));
  const absent=publicRoutes.has(candidate.route)?records.some(r=>r.kind==='source'&&!r.file&&r.route===candidate.route)?'SOURCE_CAPTURE_FAILED':'SOURCE_CAPTURE_NOT_RUN':'NO_PUBLIC_ROUTE';
  const item={route:candidate.route,viewport:candidate.viewport,candidate:{...candidate,sha256:sha(bytes)},source:source??null,status:source?'CAPTURED_NOT_CERTIFIED':absent};
  if(source) {
    const original=await readFile(join(folder,source.file));item.source={...source,sha256:sha(original)};
    const [a,b]=await Promise.all([sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true}),sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true})]);
    const rows=Math.min(a.info.height,b.info.height,candidate.viewport.height),columns=Math.min(a.info.width,b.info.width,candidate.viewport.width);const length=rows*columns*3;
    let absolute=0,changed=0;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){let delta=0;for(let c=0;c<3;c++){const d=Math.abs(a.data[(y*a.info.width+x)*3+c]-b.data[(y*b.info.width+x)*3+c]);absolute+=d;delta=Math.max(delta,d);}if(delta>32)changed++;}
    item.visual={comparison:'Unmasked first viewport, cropped common canvas with no resizing. Identity/text changes count. This metric alone is not a parity verdict.',sourcePixelSize:{width:a.info.width,height:a.info.height},candidatePixelSize:{width:b.info.width,height:b.info.height},geometryDiffers:a.info.width!==b.info.width||a.info.height!==b.info.height,comparedWidth:columns,comparedHeight:rows,meanAbsoluteChannelDifference:absolute/length,changedPixelFractionAbove32:changed/(length/3)};
  }
  pairs.push(item);
}
const summary={generatedAt:new Date().toISOString(),sourceCaptures:records.filter(r=>r.kind==='source'&&r.file).length,candidateCaptures:records.filter(r=>r.kind==='candidate'&&r.file).length,captureErrors:records.filter(r=>!r.file),paired:pairs.filter(p=>p.source).length,pairs};
await writeFile(join(folder,'visual-comparison.json'),JSON.stringify(summary,null,2));
await writeFile(join(root,'.tmp/p1-reprise/captures.json'),JSON.stringify(records.map(r=>({...r,file:'.tmp/p1-reprise/browser/'+r.file})),null,2));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await writeFile(join(folder,'index.html'),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Caléonis — revue de parité</title><style>body{font:15px system-ui;margin:24px;color:#111}header{position:sticky;top:0;background:#fff;padding:12px;border-bottom:1px solid #ddd}input{padding:10px;width:60%}article{border:1px solid #ddd;padding:16px;margin:24px 0}section{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;max-height:1200px;object-fit:contain;object-position:top;background:#eee}code{overflow-wrap:anywhere}small{display:block}</style><header><h1>Caléonis Receptionist — comparaison exhaustive</h1><p>${summary.paired} paires capturées. Les différences de pixels incluent la marque et les textes ; aucune certification automatique de parité.</p><input type="search" aria-label="Filtrer par route" placeholder="Rechercher une route"></header>${pairs.map(p=>`<article data-route="${esc(p.route)}"><h2>${esc(p.route)} · ${p.viewport.width}px</h2><p>${esc(p.status)}${p.visual?' · pixels modifiés '+(p.visual.changedPixelFractionAbove32*100).toFixed(1)+' %':''}</p><section><div><h3>Référence publique</h3>${p.source?`<img loading="lazy" src="${esc(p.source.file)}" alt="Source ${esc(p.route)}"><small>${esc(p.source.url)}</small>`:'Aucune route publique correspondante dans le sitemap contrôlé.'}</div><div><h3>Candidat Caléonis</h3><img loading="lazy" src="${esc(p.candidate.file)}" alt="Candidat ${esc(p.route)}"><small>${esc(p.candidate.url)}</small></div></section></article>`).join('')}<script>document.querySelector('input').addEventListener('input',event=>document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.route.toLowerCase().includes(event.target.value.toLowerCase())))</script></html>`);
console.log(JSON.stringify({sourceCaptures:summary.sourceCaptures,candidateCaptures:summary.candidateCaptures,paired:summary.paired,report:join(folder,'index.html')},null,2));
