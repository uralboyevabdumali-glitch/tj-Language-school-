/**
 * Renders every dashboard route, for every role, against the real API.
 *
 * The earlier smoke test only mounted "/" — the public page — so a crash on an
 * inner page (a component calling t() without the hook) went unnoticed until a
 * human clicked it. This walks the whole menu instead.
 */
import { JSDOM } from 'jsdom';
import * as esbuild from 'esbuild';
import fs from 'node:fs';

const PORT = process.env.API_PORT || '4600';
const ORIGIN = `http://127.0.0.1:${PORT}`;

const login = async (email, password) => {
  const res = await fetch(`${ORIGIN}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`login failed for ${email}: ${JSON.stringify(data)}`);
  return data.token;
};

const out = await esbuild.build({
  entryPoints: ['src/main.jsx'], bundle: true, write: false, format: 'esm', platform: 'browser',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'empty' }, jsx: 'automatic',
  define: { 'import.meta.env.DEV': 'false' },
});
fs.writeFileSync('/tmp/route-bundle.mjs', out.outputFiles[0].text);

const ROUTES = {
  admin: ['dashboard','analytics','students','requests','teachers','groups','courses','payments','attendance',
          'homework','lessons','quizzes','reviews','leads','course-requests','announcements','notifications',
          'competitions','branches','media','landing-page','settings','profile'],
  teacher: ['dashboard','live','groups','students','lessons','homework','attendance','quizzes','reviews',
            'competitions','notifications','profile'],
  student: ['dashboard','discover','group','lessons','homework','attendance','payments','tests','games',
            'leaderboard','results','competitions','extra-classes','notifications','profile'],
};

const tokens = {
  admin: await login('admin@tjlanguageschool.uz', 'Admin123!'),
  teacher: await login('teacher1@tjlanguageschool.uz', 'Teacher123!'),
  student: await login('student1@tjlanguageschool.uz', 'Student123!'),
};


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

let pass = 0; const failures = [];

// React rethrows render errors asynchronously, which would otherwise kill the
// run at the first broken page. Collect them and carry on to the next route.
let asyncError = null;
process.on('uncaughtException', (error) => { asyncError = error; });

const LANGS = (process.env.LANGS || 'uz').split(',');

for (const lang of LANGS) {
for (const [role, paths] of Object.entries(ROUTES)) {
  for (const path of paths) {
    const url = `${ORIGIN}/${role}/${path}`;
    const dom = new JSDOM(
      '<!doctype html><html><head><meta name="description" content=""><meta name="keywords" content="">' +
      '<meta property="og:title" content=""><meta property="og:description" content=""></head>' +
      '<body><div id="root"></div></body></html>',
      { url, pretendToBeVisual: true, resources: 'usable', runScripts: 'dangerously' }
    );
    for (const k of ['window','document','localStorage','location','getComputedStyle','requestAnimationFrame',
                     'cancelAnimationFrame','MutationObserver','CustomEvent','Event','HTMLElement','Element',
                     'Node','matchMedia','IntersectionObserver','XMLHttpRequest','FormData','Blob','URL']) {
      try { globalThis[k] = dom.window[k]; } catch {}
    }
    installObservers(dom.window);

    dom.window.localStorage.setItem('tj.token', tokens[role]);
    dom.window.localStorage.setItem('tj.lang', lang);

    const errors = [];
    asyncError = null;
    const orig = console.error;
    console.error = (...a) => errors.push(a.map(String).join(' '));
    try {
      await import(`/tmp/route-bundle.mjs?r=${role}-${path}-${Date.now()}`);
      await new Promise((r) => setTimeout(r, 500));
      console.error = orig;

      const text = dom.window.document.getElementById('root').textContent || '';
      const crashes = errors.filter((e) =>
        /is not defined|is not a function|Cannot read propert|undefined is not|Minified React error|Uncaught/i.test(e));
      if (asyncError) crashes.unshift(asyncError.message);

      const label = `${lang}  ${role}/${path}`;
      // A stray dictionary key on screen means a missing translation.
      const rawKey = text.match(/\b(common|menu|status|landing|auth|game|games|tests|live|review|rec|ach|admin|teacher|student|page|form|opt|btn|sec|msg|valid|register|field|state|nav|cms|enrol|err)\.[a-zA-Z]\w*/);

      if (crashes.length) failures.push({ route: label, why: crashes[0].slice(0, 180) });
      else if (text.trim().length < 20) failures.push({ route: label, why: `blank page (${text.length} chars)` });
      else if (rawKey) failures.push({ route: label, why: `untranslated key on screen: ${rawKey[0]}` });
      else pass += 1;
    } catch (error) {
      console.error = orig;
      failures.push({ route: `${lang} ${role}/${path}`, why: error.message.slice(0, 180) });
    } finally {
      // Each route gets its own DOM; without closing them the run exhausts the
      // heap long before the last page.
      dom.window.close();
    }
  }
}
}

console.log(`\nrendered OK: ${pass}   failed: ${failures.length}`);
failures.forEach((f) => console.log(`  FAIL  ${f.route}  ->  ${f.why}`));
process.exit(failures.length ? 1 : 0);
