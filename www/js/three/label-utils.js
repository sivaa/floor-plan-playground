/**
 * Shared label positioning utilities
 * Extracted from floor-plan-3d.js and isometric.js
 */

/**
 * Project a 3D position to 2D screen coordinates
 * @param {Object} config - Room config with x, z, labelY properties
 * @param {Object} camera - The camera to project from
 * @param {number} centerX - Center X offset
 * @param {number} centerZ - Center Z offset
 * @returns {Object} - Projected position (x, y in normalized device coords)
 */
export function projectLabelPosition(config, camera, centerX, centerZ) {
  const position = new THREE.Vector3(
    config.x - centerX,
    config.labelY || 3,
    config.z - centerZ
  );
  position.project(camera);
  return position;
}

/**
 * Convert normalized device coordinates to screen pixels
 * @param {Object} projectedPos - Position from projectLabelPosition
 * @param {number} containerWidth - Container width in pixels
 * @param {number} containerHeight - Container height in pixels
 * @returns {{x: number, y: number}} - Screen coordinates
 */
export function toScreenCoordinates(projectedPos, containerWidth, containerHeight) {
  return {
    x: (projectedPos.x * 0.5 + 0.5) * containerWidth,
    y: (-projectedPos.y * 0.5 + 0.5) * containerHeight
  };
}

/**
 * Update label visibility based on screen position
 * @param {HTMLElement} label - The label element
 * @param {number} x - Screen X position
 * @param {number} y - Screen Y position
 * @param {number} containerWidth - Container width
 * @param {number} containerHeight - Container height
 * @param {number} margin - Margin from edges (default 20)
 */
export function updateLabelVisibility(label, x, y, containerWidth, containerHeight, margin = 20) {
  const isVisible = containerWidth > 0 && containerHeight > 0 &&
                    x > margin && x < containerWidth - margin &&
                    y > margin && y < containerHeight - margin;

  if (isVisible) {
    label.classList.add('visible');
  } else {
    label.classList.remove('visible');
  }
}
