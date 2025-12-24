/**
 * Shared color interpolation utilities
 * Extracted from floor-plan-3d.js and isometric.js
 */

/**
 * Interpolate between colors in a scale based on a value
 * @param {number} value - The value to interpolate
 * @param {Array<{value: number, color: number}>} scale - Color scale array
 * @returns {number} - Interpolated color as hex
 */
export function interpolateColor(value, scale) {
  if (value <= scale[0].value) return scale[0].color;
  if (value >= scale[scale.length - 1].value) return scale[scale.length - 1].color;

  let lower = scale[0], upper = scale[scale.length - 1];
  for (let i = 0; i < scale.length - 1; i++) {
    if (value >= scale[i].value && value <= scale[i + 1].value) {
      lower = scale[i];
      upper = scale[i + 1];
      break;
    }
  }

  const factor = (value - lower.value) / (upper.value - lower.value);

  const lowerColor = new THREE.Color(lower.color);
  const upperColor = new THREE.Color(upper.color);
  const result = new THREE.Color();
  result.lerpColors(lowerColor, upperColor, factor);

  return result.getHex();
}

/**
 * Get room color based on temperature or humidity
 * @param {Object} room - Room object with temperature and humidity properties
 * @param {string} viewMode - 'temperature' or 'humidity'
 * @param {Array} tempColors - Temperature color scale
 * @param {Array} humidityColors - Humidity color scale
 * @returns {number} - Color as hex
 */
export function getRoomColor(room, viewMode, tempColors, humidityColors) {
  if (!room) return 0xE0E0E0;

  const value = viewMode === 'temperature' ? room.temperature : room.humidity;
  if (value === null || value === undefined) return 0xE0E0E0;

  const scale = viewMode === 'temperature' ? tempColors : humidityColors;
  return interpolateColor(value, scale);
}
