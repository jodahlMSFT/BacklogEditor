const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = 'Q:/git/BacklogEditor/BacklogEditor.html';
  const mdPath = 'Q:/git/BacklogEditor/backlog.md';
  const outPath = 'Q:/git/BacklogEditor/backlog-screenshot.png';

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Load the HTML file
  await page.goto('file:///' + htmlPath.replace(/\//g, '/'), { waitUntil: 'networkidle0' });

  // Set a wide viewport
  await page.setViewport({ width: 1400, height: 900 });

  // Inject the markdown content and trigger load, then expand all buckets
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  await page.evaluate((md) => {
    // Use the app's parseMarkdown function to load the data
    const parsed = parseMarkdown(md);
    if (parsed && parsed.length) {
      buckets = parsed.map(b => ({ ...b, expanded: true }));
    } else {
      // fallback: expand all existing buckets
      buckets = buckets.map(b => ({ ...b, expanded: true }));
    }
    render();
  }, mdContent);

  // Wait for render
  await new Promise(r => setTimeout(r, 500));

  // Get full page height
  const fullHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1400, height: fullHeight });
  await new Promise(r => setTimeout(r, 300));

  // Hide the toolbar buttons area (optional - keep it clean)
  await page.screenshot({
    path: outPath,
    fullPage: true,
  });

  await browser.close();
  console.log('Screenshot saved to: ' + outPath);
})();
