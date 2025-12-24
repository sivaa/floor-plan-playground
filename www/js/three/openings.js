/**
 * Shared door, window, and balcony opening utilities
 * Extracted from floor-plan-3d.js, isometric.js
 */

/**
 * Create door material (brown wood)
 * @returns {Object} - THREE.MeshStandardMaterial
 */
export function createDoorMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.7,
    metalness: 0.1
  });
}

/**
 * Create door handle material (metallic)
 * @returns {Object} - THREE.MeshStandardMaterial
 */
export function createHandleMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xC0C0C0,
    metalness: 0.9,
    roughness: 0.2
  });
}

/**
 * Create glass material for windows/french doors
 * @returns {Object} - THREE.MeshStandardMaterial
 */
export function createGlassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x87CEEB,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.3
  });
}

/**
 * Create frame material for windows/doors
 * @returns {Object} - THREE.MeshStandardMaterial
 */
export function createFrameMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.5,
    metalness: 0.2
  });
}

/**
 * Create swing arc geometry for door opening indicator
 * @param {number} doorWidth - Door width
 * @param {number} rotation - Door rotation
 * @param {string} swingDirection - Swing direction
 * @returns {Object} - THREE.Line arc
 */
export function createSwingArc(doorWidth, rotation = 0, swingDirection = 'south') {
  const arcRadius = doorWidth;
  const arcSegments = 32;
  let startAngle, endAngle;

  if (swingDirection === 'inward-left') {
    startAngle = rotation;
    endAngle = rotation + Math.PI / 2;
  } else if (swingDirection === 'inward-right') {
    startAngle = rotation - Math.PI / 2;
    endAngle = rotation;
  } else if (swingDirection === 'south') {
    startAngle = rotation;
    endAngle = rotation + Math.PI / 2;
  } else if (swingDirection === 'north') {
    startAngle = rotation + Math.PI / 2;
    endAngle = rotation + Math.PI;
  } else if (swingDirection === 'east') {
    startAngle = rotation - Math.PI / 2;
    endAngle = rotation;
  } else if (swingDirection === 'west') {
    startAngle = rotation + Math.PI;
    endAngle = rotation + Math.PI * 1.5;
  } else {
    startAngle = rotation;
    endAngle = rotation + Math.PI / 2;
  }

  const curve = new THREE.EllipseCurve(
    0, 0,
    arcRadius, arcRadius,
    startAngle, endAngle,
    false,
    0
  );

  const points = curve.getPoints(arcSegments);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const arcMaterial = new THREE.LineBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.6
  });

  const arc = new THREE.Line(geometry, arcMaterial);
  arc.rotation.x = -Math.PI / 2;  // Lay flat on floor

  return arc;
}

/**
 * Create standard door meshes (door + handle + swing arc)
 * @param {Object} doorConfig - Door configuration
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @param {number} wallHeight - Wall height
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createStandardDoor(doorConfig, centerX, centerZ, wallHeight) {
  const meshes = [];
  const doorWidth = 0.9;
  const doorHeight = wallHeight * 0.85;
  const posX = doorConfig.x - centerX;
  const posZ = doorConfig.z - centerZ;

  // Door panel
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, 0.08),
    createDoorMaterial()
  );
  door.position.set(posX, doorHeight / 2, posZ);
  door.rotation.y = doorConfig.rotation || 0;
  door.castShadow = true;
  meshes.push(door);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.15, 16),
    createHandleMaterial()
  );
  const handleOffsetX = 0.3 * Math.cos(doorConfig.rotation || 0);
  const handleOffsetZ = 0.3 * Math.sin(doorConfig.rotation || 0);
  handle.position.set(posX + handleOffsetX, doorHeight * 0.45, posZ + handleOffsetZ);
  handle.rotation.z = Math.PI / 2;
  meshes.push(handle);

  // Swing arc
  const arc = createSwingArc(doorWidth, doorConfig.rotation || 0, doorConfig.swingDirection || 'south');
  arc.position.set(posX, 0.02, posZ);
  meshes.push(arc);

  return meshes;
}

/**
 * Create French door meshes (double glass doors)
 * @param {Object} doorConfig - Door configuration
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @param {number} wallHeight - Wall height
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createFrenchDoor(doorConfig, centerX, centerZ, wallHeight) {
  const meshes = [];
  const doorWidth = 0.9;
  const doorHeight = wallHeight * 0.85;
  const posX = doorConfig.x - centerX;
  const posZ = doorConfig.z - centerZ;
  const gap = 0.05;
  const rot = doorConfig.rotation || 0;

  const glassMaterial = createGlassMaterial();
  const frameMaterial = createFrameMaterial();

  // Position offsets
  const offsetLeft = (doorWidth / 2 + gap / 4) * Math.cos(rot + Math.PI / 2);
  const offsetLeftZ = (doorWidth / 2 + gap / 4) * Math.sin(rot + Math.PI / 2);
  const offsetRight = (doorWidth / 2 + gap / 4) * Math.cos(rot - Math.PI / 2);
  const offsetRightZ = (doorWidth / 2 + gap / 4) * Math.sin(rot - Math.PI / 2);

  // Left door panel
  const leftDoor = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth - gap / 2, doorHeight, 0.06),
    glassMaterial
  );
  leftDoor.position.set(posX + offsetLeft, doorHeight / 2, posZ + offsetLeftZ);
  leftDoor.rotation.y = rot;
  meshes.push(leftDoor);

  // Right door panel
  const rightDoor = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth - gap / 2, doorHeight, 0.06),
    glassMaterial
  );
  rightDoor.position.set(posX + offsetRight, doorHeight / 2, posZ + offsetRightZ);
  rightDoor.rotation.y = rot;
  meshes.push(rightDoor);

  // Center frame
  const frameThickness = 0.05;
  const centerFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, doorHeight, 0.08),
    frameMaterial
  );
  centerFrame.position.set(posX, doorHeight / 2, posZ);
  centerFrame.rotation.y = rot;
  meshes.push(centerFrame);

  // Swing arcs
  const leftArc = createSwingArc(doorWidth, rot, 'inward-left');
  leftArc.position.set(posX + offsetLeft, 0.02, posZ + offsetLeftZ);
  meshes.push(leftArc);

  const rightArc = createSwingArc(doorWidth, rot, 'inward-right');
  rightArc.position.set(posX + offsetRight, 0.02, posZ + offsetRightZ);
  meshes.push(rightArc);

  return meshes;
}

/**
 * Create window meshes (frame + glass)
 * @param {Object} winConfig - Window configuration
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @param {number} wallHeight - Wall height
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createWindow(winConfig, centerX, centerZ, wallHeight) {
  const meshes = [];
  const winWidth = winConfig.size || 2.0;
  const winHeight = 1.3;

  // Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(winWidth, winHeight, 0.15),
    createFrameMaterial()
  );
  frame.position.set(winConfig.x - centerX, wallHeight * 0.55, winConfig.z - centerZ);
  frame.rotation.y = winConfig.rotation || 0;
  meshes.push(frame);

  // Glass
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(winWidth * 0.9, winHeight * 0.85, 0.06),
    createGlassMaterial()
  );
  glass.position.set(winConfig.x - centerX, wallHeight * 0.55, winConfig.z - centerZ);
  glass.rotation.y = winConfig.rotation || 0;
  meshes.push(glass);

  return meshes;
}

/**
 * Create balcony railing meshes
 * @param {Object} balconyConfig - Balcony configuration {x, z, width, depth}
 * @param {number} centerX - Apartment center X offset
 * @param {number} centerZ - Apartment center Z offset
 * @returns {Object[]} - Array of meshes to add to scene
 */
export function createBalconyRailing(balconyConfig, centerX, centerZ) {
  const meshes = [];
  const railingHeight = 1.0;
  const bal = balconyConfig;

  const railingMaterial = new THREE.MeshStandardMaterial({
    color: 0x374151,
    metalness: 0.7,
    roughness: 0.3
  });

  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x374151,
    metalness: 0.8,
    roughness: 0.2
  });

  // Front railing
  const frontRailing = new THREE.Mesh(
    new THREE.BoxGeometry(bal.width, railingHeight, 0.05),
    railingMaterial
  );
  frontRailing.position.set(bal.x - centerX, railingHeight / 2, bal.z - centerZ + bal.depth / 2);
  meshes.push(frontRailing);

  // Left railing
  const leftRailing = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, railingHeight, bal.depth),
    railingMaterial
  );
  leftRailing.position.set(bal.x - centerX - bal.width / 2, railingHeight / 2, bal.z - centerZ);
  meshes.push(leftRailing);

  // Vertical posts
  const postPositions = [
    { x: bal.x - bal.width / 2, z: bal.z + bal.depth / 2 },
    { x: bal.x + bal.width / 2, z: bal.z + bal.depth / 2 },
    { x: bal.x, z: bal.z + bal.depth / 2 }
  ];

  postPositions.forEach(pos => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, railingHeight, 8),
      postMaterial
    );
    post.position.set(pos.x - centerX, railingHeight / 2, pos.z - centerZ);
    meshes.push(post);
  });

  // Glass panel for railing
  const glassRailingMaterial = new THREE.MeshStandardMaterial({
    color: 0xccf0ff,
    transparent: true,
    opacity: 0.3,
    metalness: 0.2,
    roughness: 0.1
  });
  const glassPanel = new THREE.Mesh(
    new THREE.BoxGeometry(bal.width, railingHeight * 0.7, 0.02),
    glassRailingMaterial
  );
  glassPanel.position.set(bal.x - centerX, railingHeight * 0.4, bal.z - centerZ + bal.depth / 2);
  meshes.push(glassPanel);

  return meshes;
}
