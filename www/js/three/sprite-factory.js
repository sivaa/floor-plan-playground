/**
 * Sprite creation utilities
 * Extracted from network.js
 */

/**
 * Create a numbered sprite for wall labels
 * @param {number|string} text - The text to display
 * @param {string} color - Background color (default red)
 * @returns {Object} - Three.js Sprite object
 */
export function createNumberSprite(text, color = '#FF0000') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.4, 0.4, 1);
  return sprite;
}

/**
 * Create a compass direction sprite
 * @param {string} label - Direction label (N, S, E, W)
 * @param {string} color - Background color
 * @returns {Object} - Three.js Sprite object
 */
export function createCompassSprite(label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.8, 0.8, 1);
  return sprite;
}
