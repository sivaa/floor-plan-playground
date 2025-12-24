/**
 * Shared Three.js scene initialization utilities
 * Extracted from floor-plan-3d.js, isometric.js, network.js, sensor-config.js
 */

/**
 * Create a WebGL renderer with standard configuration
 * @param {HTMLElement} container - DOM container element
 * @param {boolean} enableShadowMapType - Whether to set shadowMap.type
 * @returns {Object} - THREE.WebGLRenderer instance
 */
export function createRenderer(container, enableShadowMapType = true) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  if (enableShadowMapType) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  container.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Create a scene with configurable background color
 * @param {number} backgroundColor - Hex color for background
 * @returns {Object} - THREE.Scene instance
 */
export function createScene(backgroundColor = 0xE8E8EA) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  return scene;
}

/**
 * Create an orthographic camera (for isometric/network views)
 * @param {HTMLElement} container - DOM container element
 * @param {number} frustumSize - Camera frustum size
 * @param {Object} position - Camera position {x, y, z}
 * @returns {Object} - THREE.OrthographicCamera instance
 */
export function createOrthographicCamera(container, frustumSize = 15, position = { x: 10, y: 10, z: 10 }) {
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(0, 0, 0);
  return camera;
}

/**
 * Create a perspective camera with OrbitControls (for 3D/config views)
 * @param {HTMLElement} container - DOM container element
 * @param {Object} OrbitControls - OrbitControls constructor class
 * @param {Object} options - Camera options
 * @returns {Object} - { camera, controls }
 */
export function createOrbitCamera(container, OrbitControls, options = {}) {
  const {
    fov = 50,
    position = { x: 0, y: 12, z: 8 },
    minDistance = 5,
    maxDistance = 40
  } = options;

  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, container);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.target.set(0, 0, 0);
  controls.update();

  return { camera, controls };
}

/**
 * Add standard 3-point lighting to a scene
 * @param {Object} scene - THREE.Scene instance
 * @param {Object} options - Lighting configuration
 * @returns {Object} - { ambient, directional, fill }
 */
export function addLighting(scene, options = {}) {
  const {
    ambientIntensity = 0.6,
    directionalIntensity = 0.8,
    directionalPosition = { x: 15, y: 20, z: 15 },
    enableShadows = true,
    fillIntensity = 0.3
  } = options;

  const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, directionalIntensity);
  directional.position.set(directionalPosition.x, directionalPosition.y, directionalPosition.z);
  directional.castShadow = enableShadows;

  if (enableShadows) {
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -15;
    directional.shadow.camera.right = 15;
    directional.shadow.camera.top = 15;
    directional.shadow.camera.bottom = -15;
  }

  scene.add(directional);

  const fill = new THREE.DirectionalLight(0xffffff, fillIntensity);
  fill.position.set(-10, 10, -10);
  scene.add(fill);

  return { ambient, directional, fill };
}

/**
 * Cleanup Three.js resources
 * @param {Object} state - State object containing scene, renderer, animationId
 */
export function cleanupThreeState(state) {
  if (state.renderer) state.renderer.dispose();
  if (state.scene) state.scene.clear();
  if (state.animationId) cancelAnimationFrame(state.animationId);
}

/**
 * Handle window resize for renderer and camera
 * @param {HTMLElement} container - DOM container
 * @param {Object} camera - THREE.Camera instance
 * @param {Object} renderer - THREE.WebGLRenderer instance
 * @param {number} frustumSize - For orthographic cameras
 */
export function handleResize(container, camera, renderer, frustumSize = null) {
  if (!container || !camera || !renderer) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;

  if (camera.isOrthographicCamera && frustumSize) {
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
  } else if (camera.isPerspectiveCamera) {
    camera.aspect = aspect;
  }

  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
