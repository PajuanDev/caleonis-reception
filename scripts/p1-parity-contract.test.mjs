import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localTarget, pageInfo, verify } from './p1-parity-contract.mjs';
test('URL decoding cannot escape review output',()=>{
  const out=join(tmpdir(),'parity-output');
  assert.equal(localTarget(out,'/%2e%2e/private'),null);
  assert.equal(localTarget(out,'/%ZZ'),null);
  assert.ok(localTarget(out,'/fr/features/').startsWith(out));
});
test('real pages preserve named anchors and a single H1',()=>{
  const p=pageInfo('<title>Guide</title><h1>Guide</h1><h2 id="google">Google</h2><a href="#google">Read</a>');
  assert.equal(p.title,'Guide'); assert.equal(p.h1,1); assert.ok(p.ids.has('google'));
});
test('missing pages, assets and anchors fail independently; external auth is not a local false positive',async()=>{
  const out=await mkdtemp(join(tmpdir(),'p1-parity-'));
  try {
    await mkdir(join(out,'guide'));
    await writeFile(join(out,'index.html'),'<title>Home</title><h1>Home</h1><a href="/missing/">Missing</a><img src="/missing.png"><a href="/guide/#absent">Guide</a><a href="https://receptionist.caleonis.com/login">Login</a>');
    await writeFile(join(out,'guide/index.html'),'<title>Guide</title><h1>Guide</h1><h2 id="present">Present</h2>');
    const report=await verify(out,'https://preview.example',{seo:false});
    assert.equal(report.failures.length,3);
    assert.ok(report.failures.some(f=>f.includes('/missing/')));
    assert.ok(report.failures.some(f=>f.includes('/missing.png')));
    assert.ok(report.failures.some(f=>f.includes('#absent')));
    assert.equal(report.externalTargets.length,1);
  } finally { await rm(out,{recursive:true,force:true}); }
});
test('srcset, CSS resources, malformed anchors and foreign SEO origins produce structured failures',async()=>{
  const out=await mkdtemp(join(tmpdir(),'p1-parity-'));
  try {
    await writeFile(join(out,'index.html'),'<html lang="fr"><title>Home</title><link rel="canonical" href="https://wrong.invalid/"><link rel="alternate" hreflang="en" href="https://wrong.invalid/en/"><h1>Home</h1><img srcset="/absent.webp 2x"><a href="/#%ZZ">Broken</a>');
    await writeFile(join(out,'style.css'),'body{background:url(/missing.webp)}');
    const r=await verify(out,'https://preview.example');
    for(const phrase of ['srcset /absent.webp','malformed anchor','wrong canonical origin','wrong hreflang origin','missing CSS resource'])assert.ok(r.failures.some(f=>f.includes(phrase)),phrase);
  } finally {await rm(out,{recursive:true,force:true});}
});
test('a localized pair cannot silently lose all hreflang declarations',async()=>{
  const out=await mkdtemp(join(tmpdir(),'p1-parity-'));
  try {
    await mkdir(join(out,'fr'));
    await writeFile(join(out,'index.html'),'<html lang="en"><title>Home</title><link rel="canonical" href="https://preview.example/"><h1>Home</h1>');
    await writeFile(join(out,'fr/index.html'),'<html lang="fr"><title>Accueil</title><link rel="canonical" href="https://preview.example/fr/"><h1>Accueil</h1>');
    const r=await verify(out,'https://preview.example');
    assert.equal(r.failures.filter(f=>f.includes('hreflang despite existing counterpart')).length,4);
  }finally{await rm(out,{recursive:true,force:true});}
});
