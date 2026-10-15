import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const contract=JSON.parse(await readFile(join(root,'.tmp/p1-reprise/link-contract.json'),'utf8'));
const records=[];
const urls=contract.externalTargets.filter(url=>{
  const u=new URL(url);
  if(u.host==='receptionist.caleonis.com') {
    records.push({url,status:'PENDING_COMBINED_STAGING',reason:'Existing app destinations or intended final-host canonical/API/help URLs. No test provider action or premature production rewrite.'});return false;
  }
  if(/\/(api|checkout|billing|unsubscribe|signout|logout)(\/|$)/i.test(u.pathname)) {
    records.push({url,status:'SKIPPED_ACTION_ENDPOINT',reason:'No account/provider action invoked by a public link audit.'});return false;
  }
  return true;
});
for(let n=0;n<urls.length;n+=10)records.push(...await Promise.all(urls.slice(n,n+10).map(async url=>{
  try {
    const head=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(15000)});
    const r=[404,405].includes(head.status)?await fetch(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(15000)}):head;
    if(r.body)await r.body.cancel();
    return {url,headStatus:head.status,method:r===head?'HEAD':'GET_AFTER_HEAD',status:r.status,finalUrl:r.url,assessment:r.ok?'PASS':[403,405,429].includes(r.status)?'REQUIRES_BROWSER':'FAIL'};
  }
  catch(e){return {url,status:null,assessment:'UNVERIFIED',error:String(e)};}
})));
const report={checkedAt:new Date().toISOString(),method:'HEAD with public GET fallback for 404/405; no forms or provider mutations',records};
await writeFile(join(root,'docs/p1/external-link-observation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({targets:records.length,checked:urls.length,failed:records.filter(r=>r.assessment==='FAIL'),unverified:records.filter(r=>['UNVERIFIED','REQUIRES_BROWSER'].includes(r.assessment)).length},null,2));
