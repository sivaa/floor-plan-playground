/**
 * Visual Regression Tests
 * Compares current screenshots against baseline using pixelmatch
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const wwwDir = join(projectRoot, 'www');
const screenshotsDir = join(projectRoot, 'screenshots');
const baselineDir = join(screenshotsDir, 'baseline');
const currentDir = join(screenshotsDir, 'test-current');
const diffDir = join(screenshotsDir, 'test-diff');

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

// Viewport configurations
const viewports = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// Screenshot states to test
const states = [
  { name: '01-default', actions: [] },
  { name: '02-show-range', actions: [{ click: 'button:has-text("Show Range")' }] },
  { name: '03-show-labels', actions: [{ click: 'button:has-text("Show Labels")' }] },
];

let server;
let browser;

function createStaticServer(port) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;
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

    srv.listen(port, () => {
      resolve(srv);
    });
  });
}

function compareImages(baselinePath, currentPath, diffPath) {
  if (!existsSync(baselinePath)) {
    return { error: 'Baseline not found', path: baselinePath };
  }
  if (!existsSync(currentPath)) {
    return { error: 'Current not found', path: currentPath };
  }

  const baseline = PNG.sync.read(readFileSync(baselinePath));
  const current = PNG.sync.read(readFileSync(currentPath));

  if (baseline.width !== current.width || baseline.height !== current.height) {
    return {
      error: 'Dimension mismatch',
      baseline: `${baseline.width}x${baseline.height}`,
      current: `${current.width}x${current.height}`,
    };
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const diffPercent = (numDiffPixels / totalPixels) * 100;

  return {
    diffPixels: numDiffPixels,
    totalPixels,
    diffPercent,
    passed: diffPercent < 0.1,
  };
}

describe('Visual Regression Tests', () => {
  beforeAll(async () => {
    // Ensure directories exist
    [currentDir, diffDir].forEach(dir => {
      ['desktop', 'tablet', 'mobile'].forEach(viewport => {
        const path = join(dir, viewport);
        if (!existsSync(path)) {
          mkdirSync(path, { recursive: true });
        }
      });
    });

    // Start server and browser
    const port = 3457;
    server = await createStaticServer(port);
    browser = await chromium.launch({ headless: true });

    // Capture screenshots for testing
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
      });

      for (const state of states) {
        const page = await context.newPage();
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        for (const action of state.actions) {
          if (action.click) {
            try {
              await page.click(action.click, { timeout: 2000 });
              await page.waitForTimeout(300);
            } catch (e) {
              // Ignore click errors
            }
          }
        }

        await page.waitForTimeout(500);

        const screenshotPath = join(currentDir, viewportName, `${state.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        await page.close();
      }

      await context.close();
    }
  }, 120000);

  // Generate tests for each viewport and state
  for (const viewportName of Object.keys(viewports)) {
    for (const state of states) {
      it(`${viewportName}/${state.name} matches baseline`, () => {
        const baselinePath = join(baselineDir, viewportName, `${state.name}.png`);
        const currentPath = join(currentDir, viewportName, `${state.name}.png`);
        const diffPath = join(diffDir, viewportName, `${state.name}.png`);

        const result = compareImages(baselinePath, currentPath, diffPath);

        if (result.error) {
          throw new Error(`${result.error}: ${result.path || ''}`);
        }

        expect(result.diffPercent).toBeLessThan(0.1);
      });
    }
  }
});
