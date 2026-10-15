import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2]??'http://127.0.0.1:4325';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('This review runs on an isolated loopback preview only.');
const manifest=JSON.parse(await readFile(join(root,'docs/p1/exhaustive-parity-manifest.json'),'utf8'));
const routes=manifest.routes.filter(r=>(r.buildPresent??r.candidateStatus===200)&&!r.route.includes('404')).map(r=>r.route);
const result=[];
for(let n=0;n<routes.length;n+=10)result.push(...await Promise.all(routes.slice(n,n+10).map(async route=>{
  const response=await fetch(new URL(route,base),{redirect:'manual',signal:AbortSignal.timeout(10000)});
  return {route,status:response.status,location:response.headers.get('location'),contentType:response.headers.get('content-type')};
})));
for(const route of ['/missing-parity-route-2026-10-15/','/aide/missing-parity-route-2026-10-15/']){
  const response=await fetch(new URL(route,base),{redirect:'manual'});result.push({route,status:response.status,negativeTest:true});
}
const failures=result.filter(r=>r.negativeTest?r.status!==404:![200,301,302,307,308].includes(r.status));
const report={checkedAt:new Date().toISOString(),base,environment:'STATIC_PREVIEW_ONLY; Next runtime and combined staging are separate gates.',result,failures};
await writeFile(join(root,'.tmp/p1-reprise/http-status.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({routes:routes.length,negativeTests:2,failures},null,2));if(failures.length)process.exitCode=1;
