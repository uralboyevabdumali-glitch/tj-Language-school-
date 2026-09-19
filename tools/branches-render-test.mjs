import { JSDOM } from 'jsdom';
import * as esbuild from 'esbuild';
import fs from 'node:fs';
const ORIGIN='http://127.0.0.1:4600';
const out = await esbuild.build({ entryPoints:['src/main.jsx'], bundle:true, write:false, format:'esm', platform:'browser',
  loader:{'.js':'jsx','.jsx':'jsx','.css':'empty'}, jsx:'automatic', define:{'import.meta.env.DEV':'false'} });
fs.writeFileSync('/tmp/bb.mjs', out.outputFiles[0].text);

// jsdom ships neither ResizeObserver nor IntersectionObserver. Recharts needs
// the first and framer-motion's whileInView the second. Both exist in every
// real browser, so these stubs close a gap in the test environment rather than
// papering over an application problem. The intersection stub reports the
// element as visible straight away so scroll-in content renders.
const installObservers = (win) => {
  if (!win.ResizeObserver) win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  if (!win.IntersectionObserver) {
    win.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ isIntersecting: true, intersectionRatio: 1, target }], this); }
      unobserve() {} disconnect() {} takeRecords() { return []; }
    };
  }
  if (!win.matchMedia) {
    win.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    });
  }
  globalThis.ResizeObserver = win.ResizeObserver;
  globalThis.IntersectionObserver = win.IntersectionObserver;
  globalThis.matchMedia = win.matchMedia;
};

let pass=0,fail=0; const ok=(l,c,d='')=>{c?(pass++,console.log('  PASS  '+l)):(fail++,console.log('  FAIL  '+l+' '+d));};
const dom=new JSDOM('<!doctype html><html><head><meta name="description" content=""><meta name="keywords" content=""><meta property="og:title" content=""><meta property="og:description" content=""></head><body><div id="root"></div></body></html>',{url:ORIGIN+'/',pretendToBeVisual:true});
for (const k of ['window','document','localStorage','location','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','MutationObserver','CustomEvent','Event','HTMLElement','Element','Node','matchMedia','IntersectionObserver','XMLHttpRequest','FormData','Blob','URL'])
  { try{globalThis[k]=dom.window[k];}catch{} }
installObservers(dom.window);
dom.window.localStorage.setItem('tj.lang','uz');
const errs=[]; const orig=console.error; console.error=(...a)=>errs.push(a.map(String).join(' '));
await import('/tmp/bb.mjs?x='+Date.now());
await new Promise(r=>setTimeout(r,1200));
console.error=orig;
const doc=dom.window.document;
const section=doc.querySelector('#branches');
ok('branches section rendered', Boolean(section));
const cards=section? section.querySelectorAll('article'):[];
ok('exactly 3 branch cards', cards.length===3, `got ${cards.length}`);
const txt=section? section.textContent:'';
ok('populated branch shows its name', txt.includes('TJ Olmaliq Markaz'));
ok('address shown', txt.includes('Amir Temur'));
ok('landmark shown', txt.includes('Bank yonida'));
ok('hours shown', txt.includes('09:00 - 20:00'));
const links=[...section.querySelectorAll('a[href^="http"]')].map(a=>a.getAttribute('href'));
ok('Google Maps link present', links.some(h=>h.includes('maps.google')));
ok('Yandex Maps link present', links.some(h=>h.includes('yandex')));
ok('map links open safely', [...section.querySelectorAll('a[target="_blank"]')].every(a=>(a.getAttribute('rel')||'').includes('noreferrer')));
ok('phone is a tel: link', Boolean(section.querySelector('a[href^="tel:"]')));
ok('photo has alt text', [...section.querySelectorAll('img')].every(i=>i.getAttribute('alt')));
ok('empty branches show the setup notice', (txt.match(/kiritilmagan|to\u2018ldiriladi/g)||[]).length>=1, txt.slice(0,80));
const real=errs.filter(e=>!/act\(|Warning:|Future Flag/i.test(e));
ok('no render errors', real.length===0, real[0]?.slice(0,150));
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail?1:0);
