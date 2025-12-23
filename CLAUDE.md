# Floor Plan Playground

A 3D Zigbee network visualization dashboard built with Three.js and Alpine.js.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run tests
npm test

# Build for production
npm run build

# Docker deployment
docker compose up -d
```

## Directory Structure

```
floor-plan-playground/
├── www/                        # Source files
│   ├── index.html              # Main entry point (modular)
│   ├── standalone-v2.html      # Reference file (baseline)
│   ├── js/
│   │   ├── config.js           # FLOOR_PLAN_CONFIG, room/device configuration
│   │   └── data/
│   │       └── zigbee-devices.js  # ZIGBEE_DEVICES array
│   ├── views/
│   │   └── network.js          # networkView() - 3D floor plan visualization
│   ├── styles/                 # CSS stylesheets
│   └── types.d.ts              # TypeScript declarations for globals
├── scripts/
│   ├── capture-screenshots.js  # Playwright screenshot capture
│   └── compare-screenshots.js  # pixelmatch comparison
├── tests/
│   └── visual-regression.test.js  # Vitest visual regression tests
├── screenshots/
│   ├── baseline/               # Reference screenshots (from standalone-v2.html)
│   └── current/                # Current screenshots (from index.html)
├── vite.config.js              # Vite configuration
├── tsconfig.json               # TypeScript/JSDoc configuration
├── vitest.config.js            # Vitest configuration
├── Dockerfile                  # Docker build
├── docker-compose.yml          # Docker orchestration
└── nginx.conf                  # Production nginx config
```

## Visual Regression Workflow

Every code change MUST be validated with screenshot comparison:

```bash
# 1. Make your code change

# 2. Capture current state
npm run screenshots:capture

# 3. Compare with baseline
npm run screenshots:compare

# 4. Review diff report
open screenshots/diff-report.html

# 5. If ANY difference > 0.1%, investigate and fix
# 6. Only commit when screenshots match
```

## Adding New Devices

Edit `www/js/data/zigbee-devices.js`:

```javascript
// Add a new device
{
  id: 'new-sensor',           // Unique ID
  name: 'SNZB-02P',           // Device model name
  type: 'end-device',         // 'coordinator', 'router', or 'end-device'
  icon: '🌡️',                  // Emoji icon
  room: 'kitchen',            // Room ID from FLOOR_PLAN_CONFIG
  x: 0.5, z: 0.5              // Relative position (0-1) within room
}
```

## Adding New Rooms

Edit `www/js/config.js` FLOOR_PLAN_CONFIG.rooms:

```javascript
{
  id: 'new-room',             // Unique room ID
  name: 'New Room',           // Display name
  icon: '🏠',                  // Emoji icon
  x: 5.0, z: 3.0,             // Center coordinates (meters)
  width: 3.0, depth: 2.5,     // Room dimensions (meters)
  color: 0x60a5fa,            // Floor color (hex)
  labelY: 3                   // Label height offset
}
```

## Key Files

| File | Purpose |
|------|---------|
| `www/views/network.js` | Main 3D scene: floor plan, walls, devices, compass |
| `www/js/config.js` | Room/device/door/window configuration |
| `www/js/data/zigbee-devices.js` | Zigbee device list |
| `www/index.html` | Main HTML entry point |
| `www/standalone-v2.html` | Visual reference (DO NOT MODIFY) |

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run screenshots:baseline` | Capture baseline from standalone-v2.html |
| `npm run screenshots:capture` | Capture current from index.html |
| `npm run screenshots:compare` | Compare current vs baseline |

## Tech Stack

- **3D Rendering**: Three.js r128 (CDN)
- **Reactivity**: Alpine.js 3.x (CDN)
- **Build**: Vite
- **Type Checking**: TypeScript via JSDoc
- **Testing**: Vitest + Playwright
- **Visual Regression**: pixelmatch + pngjs
- **Deployment**: Docker + nginx

## Success Criteria

- All 21 screenshots match baseline (< 0.1% pixel diff)
- TypeScript checking passes (`npm run typecheck`)
- All Vitest tests pass (`npm test`)
- Docker container builds and runs correctly

## Development Guidelines

1. **Evidence-Based Debugging**: Never claim something is broken without proof
2. **Visual Parity**: Every change must pass screenshot comparison
3. **No Over-Engineering**: Keep solutions simple and focused
4. **Document Changes**: Update this file for architectural changes
