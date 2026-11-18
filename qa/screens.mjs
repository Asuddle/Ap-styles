// QA harness: screenshots every section at five viewports.
// Usage: npm run build && npm run qa   (optional: QA_URL=https://preview-url npm run qa)
// Output: qa/out/<viewport>/<nn-shot>.png and qa/out/report.json (console errors per viewport)
import { chromium } from '@playwright/test'
import { preview } from 'vite'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0'

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '768x1024', width: 768, height: 1024, touch: true },
  { name: '390x844', width: 390, height: 844, touch: true },
  { name: '360x740', width: 360, height: 740, touch: true },
]

// [name, action, wait ms]
const SHOTS = [
  ['hero-load', (ap) => ap.scrollToSection('hero', 0, true), 2200],
  ['hero-cut', (ap) => ap.scrollToSection('hero', 0.25, true), 900],
  ['hero-lift', (ap) => ap.scrollToSection('hero', 0.6, true), 900],
  ['hero-end', (ap) => ap.scrollToSection('hero', 0.97, true), 900],
  ['manifesto', (ap) => ap.scrollToSection('manifesto', 0.5, true), 3500],
  ['sewing-flight', (ap) => ap.scrollToSection('sewing', 0.15, true), 900],
  ['sewing-seams', (ap) => ap.scrollToSection('sewing', 0.5, true), 900],
  ['sewing-end', (ap) => ap.scrollToSection('sewing', 0.97, true), 1400],
  ['drop-intro', (ap) => ap.scrollToBeat(-0.5, true), 900],
  ['drop-beat-1', (ap) => ap.scrollToBeat(0, true), 1600],
  ['drop-beat-3', (ap) => ap.scrollToBeat(2, true), 1600],
  ['drop-inspect', null, 1600], // clicks Inspect
  ['fitting', (ap) => ap.scrollToSection('fitting', 0.5, true), 1500],
  ['fitting-swap', null, 1600], // swaps the top
  ['finale-star', (ap) => ap.scrollToSection('finale', 0.45, true), 1400],
  ['finale-form', (ap) => ap.scrollToSection('finale', 0.8, true), 1800],
  ['footer', () => window.scrollTo(0, document.body.scrollHeight), 1000],
]

const outDir = path.resolve('qa/out')
await rm(outDir, { recursive: true, force: true })

let server = null
let base = process.env.QA_URL
if (!base) {
  server = await preview({ preview: { port: 4174, strictPort: false } })
  base = server.resolvedUrls.local[0]
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const report = {}
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(new URL('?qa', base).toString(), { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__ap && window.__ap.rt.frames > 2, null, { timeout: 30000 })
  const dir = path.join(outDir, vp.name)
  await mkdir(dir, { recursive: true })
  let i = 0
  for (const [name, action, wait] of SHOTS) {
    if (name === 'drop-inspect') {
      await page.click('.product-card button:has-text("Inspect")', { force: true }).catch((e) => errors.push('inspect click: ' + e.message))
    } else if (name === 'fitting-swap') {
      await page.click('[role=radiogroup] >> text=Boxy Tee', { force: true }).catch((e) => errors.push('swap click: ' + e.message))
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(dir, `${String(++i).padStart(2, '0')}-fitting-mid-swap.png`) })
    } else {
      if (name === 'fitting') await page.keyboard.press('Escape')
      await page.evaluate(`(${action.toString()})(window.__ap)`)
    }
    await page.waitForTimeout(wait)
    await page.screenshot({ path: path.join(dir, `${String(++i).padStart(2, '0')}-${name}.png`) })
  }
  report[vp.name] = { errors, docHeightVh: await page.evaluate(() => Math.round((document.documentElement.scrollHeight / innerHeight) * 100)) }
  await ctx.close()
  console.log(`${vp.name}: ${i} shots, ${errors.length} console errors`)
}
await browser.close()
await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
if (server) await new Promise((r) => server.httpServer.close(r))
console.log(`done → ${outDir}`)
