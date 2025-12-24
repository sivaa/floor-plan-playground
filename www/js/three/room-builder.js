/**
 * Shared room building utilities for 3D floor plans
 * Extracted from floor-plan-3d.js, isometric.js
 */

/**
 * Create glassy wall material for room walls
 * @returns {Object} - THREE.MeshStandardMaterial instance
 */
export function createGlassyWallMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    metalness: 0.4,
    roughness: 0.08,
    side: THREE.DoubleSide
  });
}

/**
 * Create a room floor mesh
 * @param {Object} config - Room configuration {width, depth, color, x, z, id}
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @returns {Object} - THREE.Mesh for the room floor
 */
export function createRoomFloor(config, centerX, centerZ) {
  const floorGeometry = new THREE.BoxGeometry(config.width, 0.05, config.depth);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: config.color,
    transparent: true,
    opacity: 0.3,
    roughness: 0.6,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.set(config.x - centerX, 0.025, config.z - centerZ);
  floor.receiveShadow = true;
  floor.name = 'floor_' + config.id;
  return floor;
}

/**
 * Create all four walls for a room
 * @param {Object} config - Room configuration {width, depth, x, z}
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @param {number} wallHeight - Height of walls
 * @param {Object} material - THREE.Material for walls
 * @returns {Object[]} - Array of wall meshes {back, front, left, right}
 */
export function createRoomWalls(config, centerX, centerZ, wallHeight, material) {
  const halfW = config.width / 2;
  const halfD = config.depth / 2;
  const rx = config.x - centerX;
  const rz = config.z - centerZ;

  const walls = [];

  // Back wall (north)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(config.width, wallHeight, 0.15),
    material
  );
  backWall.position.set(rx, wallHeight / 2, rz - halfD);
  backWall.castShadow = true;
  walls.push(backWall);

  // Front wall (south)
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(config.width, wallHeight, 0.15),
    material
  );
  frontWall.position.set(rx, wallHeight / 2, rz + halfD);
  frontWall.castShadow = true;
  walls.push(frontWall);

  // Left wall (west)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, wallHeight, config.depth),
    material
  );
  leftWall.position.set(rx - halfW, wallHeight / 2, rz);
  leftWall.castShadow = true;
  walls.push(leftWall);

  // Right wall (east)
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, wallHeight, config.depth),
    material
  );
  rightWall.position.set(rx + halfW, wallHeight / 2, rz);
  rightWall.castShadow = true;
  walls.push(rightWall);

  return walls;
}

/**
 * Create complete room group (floor + walls)
 * @param {Object} config - Room configuration
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @param {number} wallHeight - Height of walls
 * @returns {Object} - { group: THREE.Group, walls: THREE.Mesh[] }
 */
export function createRoom(config, centerX, centerZ, wallHeight) {
  const group = new THREE.Group();

  // Create floor
  const floor = createRoomFloor(config, centerX, centerZ);
  group.add(floor);

  // Create walls
  const wallMaterial = createGlassyWallMaterial();
  const walls = createRoomWalls(config, centerX, centerZ, wallHeight, wallMaterial);
  walls.forEach(wall => group.add(wall));

  return { group, walls };
}
