/**
 * Shared radiator building utilities
 * Extracted from network.js - Premium European Column Radiators with TRVZB valves
 */

import { createRadiatorMaterial, createTrvzbBodyMaterial, createLedMaterial } from './radiator-materials.js';

// Default radiator dimensions
const DEFAULT_CONFIG = {
  height: 0.30,
  width: 0.40,
  columnsPerRow: 10,
  columnRadius: 0.012,
  rowSpacing: 0.025,
  railHeight: 0.018,
  baseY: 0.04
};

/**
 * Create a European column radiator with double-row columns
 * @param {Object} options - Radiator configuration
 * @param {number} options.x - X position
 * @param {number} options.z - Z position
 * @param {number} [options.width] - Radiator width (default 0.40)
 * @param {number} [options.height] - Radiator height (default 0.30)
 * @param {string} [options.direction] - 'west' or 'east' for wall mounting direction
 * @param {Object} [options.material] - THREE.Material for radiator
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createColumnRadiator(options) {
  const meshes = [];
  const {
    x,
    z,
    width = DEFAULT_CONFIG.width,
    height = DEFAULT_CONFIG.height,
    direction = 'west',
    material = createRadiatorMaterial()
  } = options;

  const columnsPerRow = DEFAULT_CONFIG.columnsPerRow;
  const columnRadius = DEFAULT_CONFIG.columnRadius;
  const columnSpacing = width / (columnsPerRow + 1);
  const rowSpacing = DEFAULT_CONFIG.rowSpacing;
  const railHeight = DEFAULT_CONFIG.railHeight;
  const baseY = DEFAULT_CONFIG.baseY;

  // Direction multiplier (west = positive offset, east = negative offset)
  const dirMult = direction === 'west' ? 1 : -1;

  // Double-row columns (ultra-smooth with 32 segments)
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < columnsPerRow; i++) {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(columnRadius, columnRadius, height - railHeight * 2, 32),
        material
      );
      const zOffset = -width / 2 + columnSpacing * (i + 1);
      const xOffset = row * rowSpacing * dirMult;
      column.position.set(x + xOffset, baseY + height / 2, z + zOffset);
      meshes.push(column);
    }
  }

  // Top rail
  const topRail = new THREE.Mesh(
    new THREE.BoxGeometry(rowSpacing + 0.02, railHeight, width + 0.01),
    material
  );
  topRail.position.set(x + (rowSpacing / 2) * dirMult, baseY + height - railHeight / 2, z);
  meshes.push(topRail);

  // Bottom rail
  const bottomRail = new THREE.Mesh(
    new THREE.BoxGeometry(rowSpacing + 0.02, railHeight, width + 0.01),
    material
  );
  bottomRail.position.set(x + (rowSpacing / 2) * dirMult, baseY + railHeight / 2, z);
  meshes.push(bottomRail);

  // Wall brackets
  const bracketXOffset = direction === 'west' ? -0.01 : 0.01;
  [-width / 3, width / 3].forEach(zOff => {
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.025, 0.025),
      material
    );
    bracket.position.set(x + bracketXOffset, baseY + height * 0.6, z + zOff);
    meshes.push(bracket);
  });

  return meshes;
}

/**
 * Create a TRVZB smart thermostat valve assembly
 * @param {Object} options - Valve configuration
 * @param {number} options.x - X position
 * @param {number} options.z - Z position
 * @param {number} options.baseY - Base Y position (top of radiator)
 * @param {Object} [options.radiatorMaterial] - Material for connector
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createTrvzbValve(options) {
  const meshes = [];
  const {
    x,
    z,
    baseY,
    radiatorMaterial = createRadiatorMaterial()
  } = options;

  const bodyMaterial = createTrvzbBodyMaterial();
  const ledMaterial = createLedMaterial();

  // Valve body (white cylinder)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.018, 0.04, 24),
    bodyMaterial
  );
  body.position.set(x, baseY + 0.02, z);
  meshes.push(body);

  // Connector pipe
  const connector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.015, 16),
    radiatorMaterial
  );
  connector.position.set(x, baseY + 0.005, z);
  meshes.push(connector);

  // Orange LED indicator (glowing)
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.004, 16, 16),
    ledMaterial
  );
  led.position.set(x, baseY + 0.035, z + 0.012);
  meshes.push(led);

  return meshes;
}

/**
 * Create a complete radiator assembly with TRVZB valve
 * @param {Object} options - Full radiator configuration
 * @param {number} options.x - X position
 * @param {number} options.z - Z position
 * @param {number} [options.width] - Radiator width
 * @param {number} [options.height] - Radiator height
 * @param {string} [options.direction] - 'west' or 'east'
 * @param {number} [options.valveZOffset] - Z offset for valve (default width/4)
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createRadiatorWithValve(options) {
  const {
    x,
    z,
    width = DEFAULT_CONFIG.width,
    height = DEFAULT_CONFIG.height,
    direction = 'west',
    valveZOffset
  } = options;

  const radiatorMaterial = createRadiatorMaterial();
  const meshes = [];

  // Create the radiator
  const radiatorMeshes = createColumnRadiator({
    x,
    z,
    width,
    height,
    direction,
    material: radiatorMaterial
  });
  meshes.push(...radiatorMeshes);

  // Calculate valve position
  const rowSpacing = DEFAULT_CONFIG.rowSpacing;
  const baseY = DEFAULT_CONFIG.baseY;
  const dirMult = direction === 'west' ? 1 : -1;
  const valveX = x + (rowSpacing / 2) * dirMult;
  const valveZ = z + (valveZOffset !== undefined ? valveZOffset : width / 4);
  const valveBaseY = baseY + height;

  // Create the TRVZB valve
  const valveMeshes = createTrvzbValve({
    x: valveX,
    z: valveZ,
    baseY: valveBaseY,
    radiatorMaterial
  });
  meshes.push(...valveMeshes);

  return meshes;
}
