/**
 * Screenshot Comparison Script
 * Compares current screenshots against baseline using pixelmatch
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const screenshotsDir = join(projectRoot, 'screenshots');
const baselineDir = join(screenshotsDir, 'baseline');
const currentDir = join(screenshotsDir, 'current');
const diffDir = join(screenshotsDir, 'diff');

// Ensure diff directory exists
if (!existsSync(diffDir)) {
  mkdirSync(diffDir, { recursive: true });
}

const viewports = ['desktop', 'tablet', 'mobile'];

function compareImages(baselinePath, currentPath, diffPath) {
  if (!existsSync(baselinePath)) {
    return { error: 'Baseline not found', path: baselinePath };
  }
  if (!existsSync(currentPath)) {
    return { error: 'Current not found', path: currentPath };
  }

  const baseline = PNG.sync.read(readFileSync(baselinePath));
  const current = PNG.sync.read(readFileSync(currentPath));

  // Check dimensions match
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

  // Save diff image
  writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercent = (numDiffPixels / totalPixels) * 100;

  return {
    diffPixels: numDiffPixels,
    totalPixels,
    diffPercent,
    passed: diffPercent < 0.1, // Less than 0.1% difference
  };
}

function generateHtmlReport(results) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Screenshot Comparison Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .summary { padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary.passed { background: #d4edda; border: 1px solid #28a745; }
    .summary.failed { background: #f8d7da; border: 1px solid #dc3545; }
    .result { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .result.passed { border-left: 4px solid #28a745; }
    .result.failed { border-left: 4px solid #dc3545; }
    .result.error { border-left: 4px solid #ffc107; }
    .images { display: flex; gap: 10px; margin-top: 10px; }
    .images img { max-width: 300px; border: 1px solid #ddd; }
    .diff-percent { font-weight: bold; }
    .diff-percent.ok { color: #28a745; }
    .diff-percent.bad { color: #dc3545; }
  </style>
</head>
<body>
  <h1>Screenshot Comparison Report</h1>

  ${(() => {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed && !r.error).length;
    const errors = results.filter(r => r.error).length;
    const allPassed = failed === 0 && errors === 0;

    return `
    <div class="summary ${allPassed ? 'passed' : 'failed'}">
      <strong>${allPassed ? '✅ All screenshots match!' : '❌ Some screenshots differ'}</strong><br>
      Passed: ${passed} | Failed: ${failed} | Errors: ${errors}
    </div>`;
  })()}

  ${results.map(r => {
    if (r.error) {
      return `
        <div class="result error">
          <strong>⚠️ ${r.name}</strong><br>
          Error: ${r.error}
        </div>`;
    }

    const statusClass = r.passed ? 'passed' : 'failed';
    const percentClass = r.passed ? 'ok' : 'bad';

    return `
      <div class="result ${statusClass}">
        <strong>${r.passed ? '✅' : '❌'} ${r.name}</strong><br>
        <span class="diff-percent ${percentClass}">${r.diffPercent.toFixed(4)}% different</span>
        (${r.diffPixels.toLocaleString()} of ${r.totalPixels.toLocaleString()} pixels)
        ${!r.passed ? `<div class="images">
          <div><small>Baseline</small><br><img src="baseline/${r.viewport}/${r.filename}"></div>
          <div><small>Current</small><br><img src="current/${r.viewport}/${r.filename}"></div>
          <div><small>Diff</small><br><img src="diff/${r.viewport}/${r.filename}"></div>
        </div>` : ''}
      </div>`;
  }).join('\n')}
</body>
</html>`;

  writeFileSync(join(screenshotsDir, 'diff-report.html'), html);
  console.log(`\n📄 Report saved to screenshots/diff-report.html\n`);
}

async function compareAll() {
  console.log('\n🔍 Comparing screenshots...\n');

  const results = [];
  let hasFailures = false;

  for (const viewport of viewports) {
    const baselineViewportDir = join(baselineDir, viewport);
    const currentViewportDir = join(currentDir, viewport);
    const diffViewportDir = join(diffDir, viewport);

    if (!existsSync(diffViewportDir)) {
      mkdirSync(diffViewportDir, { recursive: true });
    }

    if (!existsSync(baselineViewportDir)) {
      console.log(`⚠️  No baseline found for ${viewport}`);
      continue;
    }

    const files = readdirSync(baselineViewportDir).filter(f => f.endsWith('.png'));

    for (const file of files) {
      const baselinePath = join(baselineViewportDir, file);
      const currentPath = join(currentViewportDir, file);
      const diffPath = join(diffViewportDir, file);

      const result = compareImages(baselinePath, currentPath, diffPath);
      const name = `${viewport}/${file}`;

      if (result.error) {
        console.log(`⚠️  ${name}: ${result.error}`);
        results.push({ name, viewport, filename: file, ...result });
      } else if (result.passed) {
        console.log(`✅ ${name}: ${result.diffPercent.toFixed(4)}%`);
        results.push({ name, viewport, filename: file, ...result });
      } else {
        console.log(`❌ ${name}: ${result.diffPercent.toFixed(4)}% (FAILED)`);
        results.push({ name, viewport, filename: file, ...result });
        hasFailures = true;
      }
    }
  }

  generateHtmlReport(results);

  if (hasFailures) {
    console.log('❌ Some screenshots do not match baseline!\n');
    process.exit(1);
  } else if (results.length === 0) {
    console.log('⚠️  No screenshots to compare. Run npm run screenshots:baseline first.\n');
    process.exit(1);
  } else {
    console.log('✅ All screenshots match baseline!\n');
    process.exit(0);
  }
}

compareAll();
