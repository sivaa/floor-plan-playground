/**
 * Screenshot Capture Script
 * Captures screenshots of index.html in various states and viewports
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const wwwDir = join(projectRoot, 'www');

// MIME types for static file serving
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

// Viewport configurations (desktop only)
const viewports = {
  desktop: { width: 1920, height: 1080 },
};

// Screenshot states to capture
const states = [
  { name: '01-default', actions: [] },
  { name: '02-show-range', actions: [{ click: 'button:has-text("Show Range")' }] },
  { name: '03-show-labels', actions: [{ click: 'button:has-text("Show Labels")' }] },
  { name: '04-show-wall-numbers', actions: [{ click: 'button:has-text("Show #")' }] },
  { name: '05-zoomed-in', actions: [{ click: 'button:has-text("➕")' }, { click: 'button:has-text("➕")' }] },
  { name: '06-zoomed-out', actions: [{ click: 'button:has-text("➖")' }, { click: 'button:has-text("➖")' }, { click: 'button:has-text("➖")' }, { click: 'button:has-text("➖")' }] },
  { name: '07-all-toggles', actions: [
    { click: 'button:has-text("Show Range")' },
    { click: 'button:has-text("Show Labels")' },
    { click: 'button:has-text("Show #")' },
  ]},
];

// Create a simple HTTP server to serve static files
function createStaticServer(port, defaultFile = 'index.html') {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = req.url === '/' ? `/${defaultFile}` : req.url;
      filePath = join(wwwDir, filePath);

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(content);
      } catch (err) {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function captureScreenshots(outputDir = 'baseline', externalPort = null) {
  let port, server;

  if (externalPort) {
    // Use external server (e.g., Vite on port 3000)
    port = externalPort;
    server = null;
    console.log(`\n📸 Capturing screenshots to screenshots/${outputDir}/ (from external server on port ${port})\n`);
  } else {
    // Use internal static server
    port = 3456;
    const defaultFile = 'index.html';  // Always use modular entry point
    server = await createStaticServer(port, defaultFile);
    console.log(`\n📸 Capturing screenshots to screenshots/${outputDir}/ (from ${defaultFile})\n`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      console.log(`\n📱 Viewport: ${viewportName} (${viewport.width}x${viewport.height})`);

      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
      });

      for (const state of states) {
        // Skip panned view for tablet/mobile
        if (state.name === '07-panned' && viewportName !== 'desktop') continue;

        const page = await context.newPage();
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });

        // Wait for Three.js to render (give it 2 seconds)
        await page.waitForTimeout(2000);

        // Execute actions for this state
        for (const action of state.actions) {
          if (action.click) {
            try {
              await page.click(action.click, { timeout: 2000 });
              await page.waitForTimeout(300); // Wait for animation
            } catch (e) {
              console.log(`  ⚠️  Could not click: ${action.click}`);
            }
          }
        }

        // Wait a bit more for any animations to complete
        await page.waitForTimeout(500);

        // Capture screenshot
        const screenshotPath = join(projectRoot, 'screenshots', outputDir, viewportName, `${state.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  ✅ ${state.name}.png`);

        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }

  console.log(`\n✨ Screenshot capture complete!\n`);
}

// Run with arguments:
// - 'baseline' or 'current' (output directory)
// - Optional: port number to use external server (e.g., '3000' for Vite)
const outputDir = process.argv[2] || 'baseline';
const externalPort = process.argv[3] ? parseInt(process.argv[3]) : null;
captureScreenshots(outputDir, externalPort);
