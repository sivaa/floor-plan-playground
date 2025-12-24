/**
 * Shared radiator material definitions
 * Extracted from network.js
 */

/**
 * Create main radiator material - blends with room floors
 * @returns {Object} - Three.js MeshStandardMaterial
 */
export function createRadiatorMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xC9B89A,    // Exact floor color for seamless blend
    metalness: 0.15,
    roughness: 0.75
  });
}

/**
 * Create TRVZB valve body material - white finish
 * @returns {Object} - Three.js MeshStandardMaterial
 */
export function createTrvzbBodyMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xF5F5F0,
    metalness: 0.1,
    roughness: 0.6
  });
}

/**
 * Create LED indicator material - orange glow
 * @returns {Object} - Three.js MeshStandardMaterial
 */
export function createLedMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xFF8C00,
    emissive: 0xFF6B00,
    emissiveIntensity: 0.8
  });
}
