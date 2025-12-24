/**
 * Shared theme utilities
 * Extracted from floor-plan-3d.js and isometric.js
 */

/**
 * Apply dark or light theme to a Three.js scene
 * @param {Object} scene - The Three.js scene
 * @param {boolean} isDark - Whether to apply dark theme
 */
export function applyDarkTheme(scene, isDark) {
  if (isDark) {
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 10, 50);
  } else {
    scene.background = new THREE.Color(0xE8E8EA);
    scene.fog = null;
  }
}

/**
 * Toggle visibility of wall meshes
 * @param {Array<Object>} wallMeshes - Array of wall mesh objects
 * @param {boolean} visible - Whether walls should be visible
 */
export function setWallsVisibility(wallMeshes, visible) {
  wallMeshes.forEach(wall => {
    wall.visible = visible;
  });
}
