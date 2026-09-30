// Browser smoke test: drives the built app in headless Chromium.
//   npm run build && npm run e2e
// Serves dist/ with the CSP from dist/_headers when it exists, so a change that
// breaks the policy fails here. Everything is checked as a learner would meet it.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const root = path.resolve('dist');
if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('Run `npm run build` first.'); process.exit(2); }
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

// ---- a static server that applies the /* rules from _headers
const headers = {};
const headersFile = path.join(root, '_headers');
if (fs.existsSync(headersFile)) {
  let block = '';
  for (const line of fs.readFileSync(headersFile, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!line.startsWith(' ')) block = line.trim();
    else if (block === '/*') { const i = line.indexOf(':'); headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
} else console.log('NOTE no dist/_headers, so the CSP is not being tested');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let file = path.join(root, req.url.split('?')[0]);
  if (file.endsWith(path.sep)) file += 'index.html';
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', ...headers });
  res.end(fs.readFileSync(file));
}).listen(0);
const U = `http://localhost:${server.address().port}/`;

let failed = 0;
const ok = (cond, message) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${message}`); if (!cond) failed += 1; };
const browser = await chromium.launch();

/** A fresh learner who has just finished onboarding. `bypassCSP` is only for injecting axe. */
async function learner({ scheme = 'light', bypassCSP = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, serviceWorkers: 'block', bypassCSP });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (/Content Security|Refused|violat|error/i.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
  await page.goto(U);
  await page.locator('input').first().fill('Tester');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText('A+ Core 1').first().click();
  await page.getByRole('button', { name: /next|continue/i }).first().click();
  await page.getByRole('button', { name: /skip/i }).first().click();
  await page.waitForSelector('text=Lvl');
  return { page, problems, context };
}
const text = (page) => page.locator('body').innerText();

/** Answer whatever kind of question is on screen, in a way that needs no knowledge. */
async function answerAny(page) {
  // The next question may still be rendering after a click.
  await page.locator('input[type=radio], input[type=checkbox], select, ol button, svg[role=group] g[role=button]').first().waitFor();
  if (await page.locator('svg[role=group] g[role=button]').count()) await page.locator('svg[role=group] g[role=button]').first().click();
  else if (await page.locator('input[type=radio]').count()) await page.locator('input[type=radio]').first().check();
  else if (await page.locator('input[type=checkbox]').count()) await page.locator('input[type=checkbox]').first().check();
  else if (await page.locator('select').count()) { for (const s of await page.locator('select').all()) await s.selectOption({ index: 1 }); }
  else await page.getByRole('button', { name: /down/i }).first().click();
}

// ---------------------------------------------------------------- study flow
{
  const { page, problems, context } = await learner();
  for (const [route, wanted] of [['#/learn', /Quick quiz/], ['#/path', /Next up/i], ['#/flashcards/a2-d2', /terms/], ['#/diagram/motherboard', /Motherboard/]]) {
    await page.goto(U + route); await page.waitForTimeout(600);
    ok(wanted.test(await text(page)), `${route} renders`);
  }

  // a quick quiz, any question types, ends with a score and one queued XP entry
  await page.goto(U + '#/learn'); await page.goto(U + '#/quiz/a1'); await page.waitForSelector('text=Check answer');
  for (let i = 0; i < 10; i++) {
    await answerAny(page);
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.waitForSelector('[role=status]:has-text("Correct"), [role=status]:has-text("Not quite")');
    await page.getByRole('button', { name: /Next question|Finish/ }).click();
  }
  await page.waitForSelector('text=Quiz done');
  const stored = await page.evaluate(() => new Promise((r) => { const o = indexedDB.open('lantern'); o.onsuccess = () => { const q = o.result.transaction('quizAnswers').objectStore('quizAnswers').getAll(); q.onsuccess = () => r(q.result.length); }; }));
  ok(stored === 10, `a quiz stores its answers (${stored})`);

  // an exam: timer pauses while hidden, a reload resumes, submit scores it
  await page.goto(U + '#/exam/a1'); await page.getByRole('button', { name: 'Start exam' }).click(); await page.waitForSelector('[role=timer]');
  const size = Number((/Question 1 of (\d+)/.exec(await text(page)) ?? [])[1]);
  ok(size >= 20, `the exam has ${size} questions`);
  for (let i = 0; i < 6; i++) { await answerAny(page); await page.getByRole('button', { name: 'Next', exact: true }).click(); }
  const seconds = async () => { const [m, s] = (await page.locator('[role=timer]').innerText()).replace('Time left:', '').trim().split(':').map(Number); return m * 60 + s; };
  const before = await seconds();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(800);
  ok(before - (await seconds()) <= 2, 'the exam clock stops while the tab is hidden');
  await page.reload(); await page.waitForSelector('text=Resume exam');
  ok(new RegExp(`6/${size} answered`).test(await text(page)), 'a reload offers to resume, with answers kept');
  await page.getByRole('button', { name: /Resume exam/ }).click();
  // Walk every remaining question. A screen that throws on some pairing of questions
  // (two hotspots about different diagrams once did) makes the Next button vanish.
  let walked = 0;
  for (let i = 0; i < size; i++) {
    const next = page.getByRole('button', { name: 'Next', exact: true });
    if (!(await next.count())) break;
    await next.click(); walked += 1;
    await page.waitForSelector('[role=timer]', { timeout: 5000 });
  }
  ok(walked >= size - 8, `every question of the exam renders (${walked} steps)`);
  await page.getByRole('button', { name: 'Question list' }).click();
  await page.getByRole('button', { name: 'Review and submit' }).click();
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.waitForSelector('text=Exam done');
  ok(/by domain/i.test(await text(page)), 'submitting shows the results by domain');

  // the career path opens steps as you mark them and moves the character up
  for (const id of ['aplus-core1', 'aplus-core2', 'role-help-desk']) {
    await page.goto(U + '#/path/' + id);
    await page.getByRole('button', { name: /^(Start|Mark done anyway)$/ }).first().click().catch(() => {});
    await page.getByRole('button', { name: /^Mark done$/ }).click().catch(() => {});
    await page.waitForSelector('text=Reopen');
  }
  await page.goto(U + '#/'); await page.waitForSelector('text=Lvl');
  ok(/Lvl 2 · Help desk/.test(await text(page)), 'finishing the help desk role moves the character up');
  ok(problems.length === 0, `no CSP violations or console errors ${problems.length ? JSON.stringify(problems) : ''}`);
  await context.close();
}

// ---------------------------------------------------- keyboard-only diagram
{
  const { page, context } = await learner();
  await page.goto(U + '#/diagram/motherboard'); await page.waitForSelector('svg[role=group]');
  await page.getByRole('button', { name: 'Match', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Rear I/O panel', exact: true }).focus(); await page.keyboard.press('Enter');
  ok(await page.getByRole('button', { name: 'Rear I/O panel', exact: true }).getAttribute('aria-pressed') === 'true', 'a name can be picked with the keyboard');
  await page.locator('svg g[role=button]').first().focus(); await page.keyboard.press('Enter');
  ok(/Right: part 1 is Rear I\/O panel/.test(await text(page)), 'a part can be matched with the keyboard, and right is announced in words');
  await page.getByRole('button', { name: 'CMOS battery', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.locator('svg g[role=button]').nth(1).focus(); await page.keyboard.press('Enter');
  ok(/Not that one/.test(await text(page)), 'a wrong match is announced in words');
  await page.locator('svg g[role=button]').first().focus(); await page.keyboard.press('ArrowRight');
  ok((await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')).startsWith('Part 2'), 'arrow keys move between parts');
  await context.close();
}

// ------------------------------------------------------------------- axe
for (const scheme of ['light', 'dark']) {
  const { page, context } = await learner({ scheme, bypassCSP: true });
  const audit = async (name) => {
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }));
    ok(result.violations.length === 0, `axe clean: ${scheme} ${name} ${result.violations.map((v) => `${v.id}(${v.nodes.length})`).join(' ')}`);
  };
  for (const route of ['#/', '#/learn', '#/path', '#/path/role-help-desk', '#/me', '#/diagram/motherboard', '#/diagram/topologies', '#/flashcards/a1-d3']) {
    await page.goto(U + route); await page.waitForTimeout(500); await audit(route);
  }
  // Calm mode and the largest text size: the settings apply, nothing overflows, axe stays clean.
  await page.goto(U + '#/me'); await page.waitForSelector('#me-calm');
  await page.locator('#me-calm').click();
  await page.getByRole('button', { name: 'Larger', exact: true }).click();
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.hasAttribute('data-calm') && document.documentElement.style.fontSize === '125%'), `calm and larger text apply to the page (${scheme})`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no sideways scroll at larger text (${scheme})`);
  await audit('#/me calm + larger text');
  await page.goto(U + '#/learn'); await page.goto(U + '#/quiz/a1-d2'); await page.waitForSelector('text=Check answer'); await audit('a quiz question');
  await page.goto(U + '#/exam/a1'); await page.waitForSelector('text=Start exam'); await audit('the exam intro');
  await context.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
