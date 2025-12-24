/**
 * Network View - Zigbee mesh visualization
 * Warm beige monochromatic 3D floor plan with device markers
 */

import { ZIGBEE_DEVICES } from '../js/data/zigbee-devices.js';
import { FLOOR_PLAN_CONFIG } from '../js/config.js';

// Persistent state across view switches
const networkState = {
  scene: null,
  camera: null,
  renderer: null,
  roomMeshes: {},
  wallMeshes: [],
  wallNumberSprites: [],
  deviceMeshes: {},
  labelElements: {},
  signalElements: {},
  animationId: null,
  isInitialized: false,
  panOffset: { x: 0, z: 0 },
  isPanning: false,
  lastPanPos: { x: 0, y: 0 }
};

export function networkView() {
  const centerX = FLOOR_PLAN_CONFIG.apartmentWidth / 2;
  const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;

  return {
    showSignalRange: false,
    showLabels: false,
    showWallNumbers: false,
    autoRotate: false,
    rotationAngle: 0,
    zoomLevel: 2.0,
    deviceCount: ZIGBEE_DEVICES.length,
    routerCount: ZIGBEE_DEVICES.filter(d => d.type === 'router').length,
    endDeviceCount: ZIGBEE_DEVICES.filter(d => d.type === 'end-device').length,

    init() {
      this.waitForContainer();
    },

    waitForContainer() {
      const container = this.$refs.networkContainer;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.waitForContainer(), 100);
        return;
      }

      if (networkState.isInitialized && networkState.renderer) {
        if (!container.contains(networkState.renderer.domElement)) {
          container.appendChild(networkState.renderer.domElement);
        }
        this.createLabels(container);
        this.onResize();
        return;
      }

      if (networkState.renderer) networkState.renderer.dispose();
      if (networkState.scene) networkState.scene.clear();
      if (networkState.animationId) cancelAnimationFrame(networkState.animationId);

      this.initScene();
      this.initCamera(container);
      this.initRenderer(container);
      this.initLighting();
      this.buildFloorPlan();
      this.addWallNumbers();
      this.createDevices();
      this.createLabels(container);
      this.setupPanControls(container);
      this.animate();
      networkState.isInitialized = true;

      window.addEventListener('resize', () => this.onResize());
    },

    initScene() {
      networkState.scene = new THREE.Scene();
      // Warm beige gradient background
      networkState.scene.background = new THREE.Color(0xE8DFD4);
    },

    initCamera(container) {
      const aspect = container.clientWidth / container.clientHeight;
      const frustumSize = 15;
      networkState.camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2, 0.1, 1000
      );
      networkState.camera.position.set(10, 10, 10);
      networkState.camera.lookAt(0, 0, 0);
    },

    initRenderer(container) {
      networkState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      networkState.renderer.setSize(container.clientWidth, container.clientHeight);
      networkState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      networkState.renderer.shadowMap.enabled = true;
      networkState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(networkState.renderer.domElement);
    },

    initLighting() {
      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      networkState.scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 0.6);
      directional.position.set(15, 20, 15);
      directional.castShadow = false;  // No shadows anywhere
      networkState.scene.add(directional);
      const fill = new THREE.DirectionalLight(0xffffff, 0.3);
      fill.position.set(-10, 10, -10);
      networkState.scene.add(fill);
    },

    addWallNumbers() {
      // Clear existing wall number sprites
      networkState.wallNumberSprites.forEach(sprite => {
        networkState.scene.remove(sprite);
        if (sprite.material.map) sprite.material.map.dispose();
        sprite.material.dispose();
      });
      networkState.wallNumberSprites = [];

      // Add number labels at start, middle, end of each wall for precise identification
      const createNumberSprite = (text, color = '#FF0000') => {
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
      };

      // Direction labels by POSITION (reliable regardless of wall creation order)
      // Outer walls are identified by: edge position + full length
      const getOuterWallDirection = (wall) => {
        const apartmentWidth = FLOOR_PLAN_CONFIG.apartmentWidth;   // 9.239
        const apartmentDepth = FLOOR_PLAN_CONFIG.apartmentDepth;   // 7.665
        const halfW = apartmentWidth / 2;  // 4.6195
        const halfD = apartmentDepth / 2;  // 3.8325
        const tolerance = 0.05;  // Position tolerance (5cm) - outer walls are at exact edges
        const lengthTolerance = 0.2;  // Length must be within 20cm of full apartment dimension

        const params = wall.geometry.parameters;
        const isHorizontal = params.width > params.depth;  // Runs along X axis
        const isVertical = params.depth > params.width;    // Runs along Z axis

        let result = null;

        // Check for full-length horizontal walls (North/South)
        // In isometric view: z=-halfD appears at TOP (South), z=+halfD at BOTTOM (North)
        if (isHorizontal && Math.abs(params.width - apartmentWidth) < lengthTolerance) {
          if (Math.abs(wall.position.z - (-halfD)) < tolerance) result = 'S';  // Top edge
          else if (Math.abs(wall.position.z - halfD) < tolerance) result = 'N';  // Bottom edge
        }

        // Check for full-length vertical walls (West/East)
        // In isometric view: x=-halfW appears at LEFT (East), x=+halfW at RIGHT (West)
        if (isVertical && Math.abs(params.depth - apartmentDepth) < lengthTolerance) {
          if (Math.abs(wall.position.x - (-halfW)) < tolerance) result = 'E';  // Left edge
          else if (Math.abs(wall.position.x - halfW) < tolerance) result = 'W';  // Right edge
        }

        return result;
      };

      networkState.wallMeshes.forEach((wall, index) => {
        const geom = wall.geometry;
        const params = geom.parameters;
        const wx = wall.position.x;
        const wy = wall.position.y + 0.5;
        const wz = wall.position.z;

        // Check if this is an outer wall with direction label (by position)
        const directionLabel = getOuterWallDirection(wall);

        // Determine if wall is horizontal (along X) or vertical (along Z)
        const isHorizontal = params.width > params.depth;
        const wallLength = isHorizontal ? params.width : params.depth;
        const halfLen = wallLength / 2 * 0.8; // 80% to stay within wall bounds

        // Create 3 sprites: start, middle, end
        const positions = isHorizontal
          ? [[wx - halfLen, wy, wz], [wx, wy, wz], [wx + halfLen, wy, wz]]
          : [[wx, wy, wz - halfLen], [wx, wy, wz], [wx, wy, wz + halfLen]];

        positions.forEach((pos, i) => {
          // Use direction label (N/S/E/W) for outer walls, index number for inner walls
          const label = directionLabel || index.toString();
          // Green for direction labels, Red/Blue for numbered walls
          const color = directionLabel ? '#228B22' : (i === 1 ? '#FF0000' : '#0066CC');
          const sprite = createNumberSprite(label, color);
          sprite.position.set(pos[0], pos[1], pos[2]);
          sprite.visible = false;  // Hidden by default
          networkState.scene.add(sprite);
          networkState.wallNumberSprites.push(sprite);
        });
      });
    },

    toggleWallNumbers() {
      this.showWallNumbers = !this.showWallNumbers;
      networkState.wallNumberSprites.forEach(sprite => {
        sprite.visible = this.showWallNumbers;
      });
    },

    /**
     * WALL INDEX REFERENCE (Fully consolidated walls)
     * =================================================
     * Walls are pushed to networkState.wallMeshes in this EXACT order:
     *
     * FIRST: Room walls via createRoom() for each room in config order:
     *   Study:    0=left (back→north wall, front skipped, right→east wall)
     *   Living:   (none - all consolidated)
     *   Bedroom:  1=right divider (back skipped, left→west wall, front→south wall)
     *   Kitchen:  (none - all consolidated)
     *   Bathroom: 2=front (back→north wall, left→west wall, right→east wall)
     *
     * THEN: Consolidated walls created in buildFloorPlan():
     *   3 = Study↔Living horizontal divider
     *   4 = Coat hanging wall (hallway, 30% from north)
     *   5 = North wall (z=0, full apartment width)
     *   6 = West wall (x=0, full apartment depth)
     *   7 = East wall upper (Bathroom+Kitchen right, z=0 to z=3.697)
     *   8 = East wall lower (Study+Living right, z=0 to z=7.665)
     *   9 = South wall (full apartment width at z=7.665)
     *
     * TOTAL: 10 walls (indices 0-9)
     */
    buildFloorPlan() {
      console.log('[FLOORPLAN DEBUG] buildFloorPlan() called');
      networkState.wallMeshes = [];
      const centerX = FLOOR_PLAN_CONFIG.apartmentWidth / 2;  // 4.6195
      const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;  // 3.8325
      const floorColor = 0xC9B89A;  // Warm beige (same as rooms)

      // Base floor covering entire apartment (fills all gaps)
      const baseFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(FLOOR_PLAN_CONFIG.apartmentWidth + 2, FLOOR_PLAN_CONFIG.apartmentDepth + 2),
        new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.8 })
      );
      baseFloor.rotation.x = -Math.PI / 2;
      baseFloor.position.set(0, 0.001, 0);  // Lowest level, centered
      baseFloor.receiveShadow = true;
      networkState.scene.add(baseFloor);

      // Build rooms (each room has its own floor and outer walls)
      // NOTE: This runs FIRST, creating walls 0-15
      FLOOR_PLAN_CONFIG.rooms.forEach(config => {
        this.createRoom(config);
      });

      // Interior divider walls (created AFTER room walls, so these are walls 16-17)
      const wallHeight = 0.8;
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xB5A080, roughness: 0.7, transparent: true, opacity: 0.6 });

      // Get room references
      const study = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'study');
      const living = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'living');
      const kitchen = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'kitchen');
      const bedroom = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'bedroom');
      const bathroom = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'bathroom');

      // Wall 3: Study ↔ Living (horizontal divider wall with 2 door openings)
      // Moved 0.5m towards study (into study area)
      const studyFrontZ = study.z + study.depth/2 - 0.5;  // 3.197 (moved towards study)

      // Door openings (0.42m wide each - reduced 30%)
      const doorWidth = 0.42;
      const door4X = 3.8;  // Bedroom ↔ Hallway (west door)
      const door2X = 4.8;  // Living ↔ Hallway (east door)

      const door4Left = door4X - doorWidth/2;   // 3.2
      const door4Right = door4X + doorWidth/2;  // 3.8
      const door2Left = door2X - doorWidth/2;   // 4.5
      const door2Right = door2X + doorWidth/2;  // 5.1

      // Left segment: from west edge (0) to door4 left edge
      const wall3LeftWidth = door4Left;
      const wall3Left = new THREE.Mesh(new THREE.BoxGeometry(wall3LeftWidth, wallHeight, 0.08), wallMat);
      wall3Left.position.set(door4Left/2 - centerX, wallHeight/2, studyFrontZ - centerZ);
      networkState.scene.add(wall3Left);
      networkState.wallMeshes.push(wall3Left);

      // Middle segment: from door4 right edge to door2 left edge
      const wall3MidWidth = door2Left - door4Right;  // 4.5 - 3.8 = 0.7
      const wall3Mid = new THREE.Mesh(new THREE.BoxGeometry(wall3MidWidth, wallHeight, 0.08), wallMat);
      wall3Mid.position.set(door4Right + wall3MidWidth/2 - centerX, wallHeight/2, studyFrontZ - centerZ);
      networkState.scene.add(wall3Mid);
      networkState.wallMeshes.push(wall3Mid);

      // Right segment: from door2 right edge to east edge
      const wall3RightWidth = FLOOR_PLAN_CONFIG.apartmentWidth - door2Right;
      const wall3Right = new THREE.Mesh(new THREE.BoxGeometry(wall3RightWidth, wallHeight, 0.08), wallMat);
      wall3Right.position.set(door2Right + wall3RightWidth/2 - centerX, wallHeight/2, studyFrontZ - centerZ);
      networkState.scene.add(wall3Right);
      networkState.wallMeshes.push(wall3Right);

      // Wall 2: Kitchen ↔ Bedroom - REMOVED (was wall index 17)
      // This interior divider was redundant - bedroom's back wall already defines the boundary

      // Wall 4: Coat hanging wall in hallway (30% from north towards Study↔Living divider)
      const wall16Z = 0;  // North connector position
      const wall15Z = study.z + study.depth/2;  // 3.697 (Study↔Living divider)
      const coatWallLength = (wall15Z - wall16Z) * 0.30;  // 30% of distance ≈ 1.1m
      const coatWallCenterZ = wall16Z + coatWallLength / 2;  // Start from wall 16

      // Position towards study (middle of hallway-study boundary)
      const coatWallX = 4.6;  // Moved from hallway center (3.839) towards study

      const coatWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, coatWallLength), wallMat);
      coatWall.position.set(coatWallX - centerX, wallHeight/2, coatWallCenterZ - centerZ);
      networkState.scene.add(coatWall);
      networkState.wallMeshes.push(coatWall);

      // Wall 5: North wall (consolidated from Study back + connector + Bathroom back)
      // Split into 2 segments with main entry door at x=3.5
      const mainDoorX = 4.0;
      const mainDoorWidth = 0.42;
      const mainDoorLeft = mainDoorX - mainDoorWidth/2;  // 3.29
      const mainDoorRight = mainDoorX + mainDoorWidth/2;  // 3.71

      // Segment 1: x=0 to door left edge (west side)
      const northSeg1Width = mainDoorLeft;  // 3.29
      const northWall1 = new THREE.Mesh(new THREE.BoxGeometry(northSeg1Width, wallHeight, 0.08), wallMat);
      northWall1.position.set(northSeg1Width/2 - centerX, wallHeight/2, -centerZ);
      networkState.scene.add(northWall1);
      networkState.wallMeshes.push(northWall1);

      // Segment 2: door right edge to apartment east edge (east side)
      const northSeg2Width = FLOOR_PLAN_CONFIG.apartmentWidth - mainDoorRight;  // 9.239 - 3.71 = 5.529
      const northSeg2CenterX = (mainDoorRight + FLOOR_PLAN_CONFIG.apartmentWidth) / 2 - centerX;
      const northWall2 = new THREE.Mesh(new THREE.BoxGeometry(northSeg2Width, wallHeight, 0.08), wallMat);
      northWall2.position.set(northSeg2CenterX, wallHeight/2, -centerZ);
      networkState.scene.add(northWall2);
      networkState.wallMeshes.push(northWall2);

      // Wall 7: West wall with W5 + W4 + W3 window cuts (proper frame)
      // Creates 6 pieces: sill, header, section1-4 - with 3 window holes
      const notch = FLOOR_PLAN_CONFIG.balconyNotch;
      const westWallX = 0;  // West edge
      const westWallDepth = FLOOR_PLAN_CONFIG.apartmentDepth;  // 6.665
      const westWallThick = 0.08;

      // Window parameters for west wall
      const westNormalWidth = 0.7;  // Base window width
      const w5Width = westNormalWidth * 0.9;   // W5 = 0.63m (Bathroom, 0.9x normal)
      const w4Width = westNormalWidth * 1.125; // W4 = 0.7875m (Kitchen, 1.125x normal)
      const w3Width = westNormalWidth * 2.0;   // W3 = 1.4m (Bedroom, 2x normal)
      const westSillHeight = 0.2;     // Bottom of windows (y=0 to 0.2)
      const westHeaderStart = 0.6;    // Top of window openings (y=0.6 to 0.8)
      const westMiddleHeight = westHeaderStart - westSillHeight;  // 0.4

      // W5 window (Bathroom) - centered at z=0.6
      const w5CenterZ = 0.6;
      const w5Left = w5CenterZ - w5Width / 2;
      const w5Right = w5CenterZ + w5Width / 2;

      // W4 window (Kitchen) - centered at z=2.3
      const w4CenterZ = 2.3;
      const w4Left = w4CenterZ - w4Width / 2;
      const w4Right = w4CenterZ + w4Width / 2;

      // W3 window (Bedroom) - centered at z=4.7 (moved north)
      const w3CenterZ = 4.7;
      const w3Left = w3CenterZ - w3Width / 2;   // 4.8
      const w3Right = w3CenterZ + w3Width / 2;  // 6.2

      // 1. SILL - full length bottom strip (y=0 to westSillHeight)
      const westSill = new THREE.Mesh(
        new THREE.BoxGeometry(westWallThick, westSillHeight, westWallDepth), wallMat
      );
      westSill.position.set(westWallX - centerX, westSillHeight/2, 0);
      networkState.scene.add(westSill);
      networkState.wallMeshes.push(westSill);

      // 2. HEADER - full length top strip (y=westHeaderStart to wallHeight)
      const westHeaderHeight = wallHeight - westHeaderStart;  // 0.2
      const westHeader = new THREE.Mesh(
        new THREE.BoxGeometry(westWallThick, westHeaderHeight, westWallDepth), wallMat
      );
      westHeader.position.set(westWallX - centerX, westHeaderStart + westHeaderHeight/2, 0);
      networkState.scene.add(westHeader);
      networkState.wallMeshes.push(westHeader);

      // 3. SECTION 1 - from z=0 to W5 left
      const westSec1Depth = w5Left;
      const westSection1 = new THREE.Mesh(
        new THREE.BoxGeometry(westWallThick, westMiddleHeight, westSec1Depth), wallMat
      );
      westSection1.position.set(westWallX - centerX, westSillHeight + westMiddleHeight/2, westSec1Depth/2 - centerZ);
      networkState.scene.add(westSection1);
      networkState.wallMeshes.push(westSection1);

      // 4. SECTION 2 - from W5 right to W4 left
      const westSec2Depth = w4Left - w5Right;
      const westSection2 = new THREE.Mesh(
        new THREE.BoxGeometry(westWallThick, westMiddleHeight, westSec2Depth), wallMat
      );
      westSection2.position.set(westWallX - centerX, westSillHeight + westMiddleHeight/2, w5Right + westSec2Depth/2 - centerZ);
      networkState.scene.add(westSection2);
      networkState.wallMeshes.push(westSection2);

      // 5. SECTION 3 - from W4 right to W3 left
      const westSec3Depth = w3Left - w4Right;
      const westSection3 = new THREE.Mesh(
        new THREE.BoxGeometry(westWallThick, westMiddleHeight, westSec3Depth), wallMat
      );
      westSection3.position.set(westWallX - centerX, westSillHeight + westMiddleHeight/2, w4Right + westSec3Depth/2 - centerZ);
      networkState.scene.add(westSection3);
      networkState.wallMeshes.push(westSection3);

      // 6. SECTION 4 - from W3 right to wall end
      const westSec4Depth = westWallDepth - w3Right;
      const westSection4 = new THREE.Mesh(
        new THREE.BoxGeometry(westWallThick, westMiddleHeight, westSec4Depth), wallMat
      );
      westSection4.position.set(westWallX - centerX, westSillHeight + westMiddleHeight/2, w3Right + westSec4Depth/2 - centerZ);
      networkState.scene.add(westSection4);
      networkState.wallMeshes.push(westSection4);

      // Window openings (no mesh = holes):
      // W5: Bathroom, W4: Kitchen, W3: Bedroom

      // Wall 10: East wall upper (Bathroom+Kitchen right consolidated)
      // Split into 3 segments with 2 door openings: bathroom (z=0.7) and kitchen (z=2.5)
      const wall10X = bathroom.x + bathroom.width/2;  // Right edge of bathroom/kitchen area (3.15)
      const wall10DoorWidth = 0.42;

      // Bathroom door at z=0.7
      const bathDoorZ = 0.7;
      const bathDoorTop = bathDoorZ - wall10DoorWidth/2;  // 0.49
      const bathDoorBottom = bathDoorZ + wall10DoorWidth/2;  // 0.91

      // Kitchen door at z=2.5
      const kitchenDoorZ = 2.5;
      const kitchenDoorTop = kitchenDoorZ - wall10DoorWidth/2;  // 2.29
      const kitchenDoorBottom = kitchenDoorZ + wall10DoorWidth/2;  // 2.71

      // Segment 1: z=0 to bathroom door top
      const wall10Seg1Depth = bathDoorTop;  // 0.49
      const eastWallUpper1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, wall10Seg1Depth), wallMat);
      eastWallUpper1.position.set(wall10X - centerX, wallHeight/2, wall10Seg1Depth/2 - centerZ);
      networkState.scene.add(eastWallUpper1);
      networkState.wallMeshes.push(eastWallUpper1);

      // Segment 2: bathroom door bottom to kitchen door top
      const wall10Seg2Depth = kitchenDoorTop - bathDoorBottom;  // 2.29 - 0.91 = 1.38
      const wall10Seg2CenterZ = (bathDoorBottom + kitchenDoorTop) / 2 - centerZ;
      const eastWallUpper2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, wall10Seg2Depth), wallMat);
      eastWallUpper2.position.set(wall10X - centerX, wallHeight/2, wall10Seg2CenterZ);
      networkState.scene.add(eastWallUpper2);
      networkState.wallMeshes.push(eastWallUpper2);

      // Segment 3: kitchen door bottom to studyFrontZ
      const wall10Seg3Depth = studyFrontZ - kitchenDoorBottom;  // 3.197 - 2.71 = 0.487
      const wall10Seg3CenterZ = (kitchenDoorBottom + studyFrontZ) / 2 - centerZ;
      const eastWallUpper3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, wall10Seg3Depth), wallMat);
      eastWallUpper3.position.set(wall10X - centerX, wallHeight/2, wall10Seg3CenterZ);
      networkState.scene.add(eastWallUpper3);
      networkState.wallMeshes.push(eastWallUpper3);

      // Wall 14: East wall lower with W1 + W2 window cuts (proper frame)
      // Creates 5 pieces: sill, header, section1, section2, section3 - with 2 window holes
      const wall9X = FLOOR_PLAN_CONFIG.apartmentWidth;  // 9.239 (east edge)
      const eastWallEndZ = FLOOR_PLAN_CONFIG.apartmentDepth - notch.depth;  // 5.165
      const wallThick = 0.08;

      // Window parameters (different sizes for W1 and W2)
      const normalWidth = 0.7;  // Base window width
      const w1Width = normalWidth * 2.3;  // W1 = 1.61m (2.3x normal)
      const w2Width = normalWidth * 1.25; // W2 = 0.875m (1.25x normal)
      const sillHeight = 0.2;     // Bottom of windows (y=0 to 0.2)
      const headerStart = 0.6;    // Top of window openings (y=0.6 to 0.8)
      const middleHeight = headerStart - sillHeight;  // 0.4

      // W1 window (Study) - centered at z=1.5, width 1.61m (shifted north)
      const w1CenterZ = 1.5;
      const w1Left = w1CenterZ - w1Width / 2;   // 1.043
      const w1Right = w1CenterZ + w1Width / 2;  // 2.653

      // W2 window (Living) - centered at z=4.2, width 0.875m
      const w2CenterZ = 4.2;
      const w2Left = w2CenterZ - w2Width / 2;   // 3.7625
      const w2Right = w2CenterZ + w2Width / 2;  // 4.6375

      // 1. SILL - full length bottom strip (y=0 to sillHeight)
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, sillHeight, eastWallEndZ), wallMat
      );
      sill.position.set(wall9X - centerX, sillHeight/2, eastWallEndZ/2 - centerZ);
      networkState.scene.add(sill);
      networkState.wallMeshes.push(sill);

      // 2. HEADER - full length top strip (y=headerStart to wallHeight)
      const headerHeight = wallHeight - headerStart;  // 0.2
      const header = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, headerHeight, eastWallEndZ), wallMat
      );
      header.position.set(wall9X - centerX, headerStart + headerHeight/2, eastWallEndZ/2 - centerZ);
      networkState.scene.add(header);
      networkState.wallMeshes.push(header);

      // 3. SECTION 1 - from z=0 to W1 left (y=sillHeight to headerStart)
      const sec1Depth = w1Left;  // 1.498
      const section1 = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, middleHeight, sec1Depth), wallMat
      );
      section1.position.set(wall9X - centerX, sillHeight + middleHeight/2, sec1Depth/2 - centerZ);
      networkState.scene.add(section1);
      networkState.wallMeshes.push(section1);

      // 4. SECTION 2 - from W1 right to W2 left (y=sillHeight to headerStart)
      const sec2Depth = w2Left - w1Right;  // 3.85 - 2.198 = 1.652
      const section2 = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, middleHeight, sec2Depth), wallMat
      );
      section2.position.set(wall9X - centerX, sillHeight + middleHeight/2, w1Right + sec2Depth/2 - centerZ);
      networkState.scene.add(section2);
      networkState.wallMeshes.push(section2);

      // 5. SECTION 3 - from W2 right to wall end (y=sillHeight to headerStart)
      const sec3Depth = eastWallEndZ - w2Right;  // 5.165 - 4.55 = 0.615
      const section3 = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, middleHeight, sec3Depth), wallMat
      );
      section3.position.set(wall9X - centerX, sillHeight + middleHeight/2, w2Right + sec3Depth/2 - centerZ);
      networkState.scene.add(section3);
      networkState.wallMeshes.push(section3);

      // Window openings (no mesh = holes):
      // W1: z=1.498 to 2.198, y=0.2 to 0.6 (Study)
      // W2: z=3.85 to 4.55, y=0.2 to 0.6 (Living)

      // Wall 10: South wall (gap on EAST side for balcony notch)
      const southWallZ = FLOOR_PLAN_CONFIG.apartmentDepth;  // 6.665
      const southWallWidth = FLOOR_PLAN_CONFIG.apartmentWidth - notch.width;  // 9.239 - 1.0 = 8.239
      const southWallCenterX = southWallWidth / 2 - centerX;  // Gap on EAST side
      const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(southWallWidth, wallHeight, 0.08),
        wallMat
      );
      southWall.position.set(southWallCenterX, wallHeight/2, southWallZ - centerZ);
      networkState.scene.add(southWall);
      networkState.wallMeshes.push(southWall);

      // ========== BALCONY AT SE CORNER, EXTENDS EAST ==========

      // Balcony positions
      const balconyOuterX = FLOOR_PLAN_CONFIG.apartmentWidth + notch.width;  // 9.239 + 1.0 = 10.239
      const balconyStartZ = FLOOR_PLAN_CONFIG.apartmentDepth - notch.depth;  // 6.665 - 1.5 = 5.165
      const notchFloorZ = (FLOOR_PLAN_CONFIG.apartmentDepth - notch.depth / 2) - centerZ;

      // Balcony floor - covers BOTH notch (inside) AND extension (outside east)
      const balconyFloorColor = 0xC9B89A;  // Warm beige (same as room floors)
      const balconyFloorMat = new THREE.MeshStandardMaterial({
        color: balconyFloorColor,
        roughness: 0.8
      });

      // Notch floor (inside building) - from x=8.239 to x=9.239
      const notchFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(notch.width, notch.depth),
        balconyFloorMat
      );
      notchFloor.rotation.x = -Math.PI / 2;
      const notchFloorX = (FLOOR_PLAN_CONFIG.apartmentWidth - notch.width / 2) - centerX;
      notchFloor.position.set(notchFloorX, 0.01, notchFloorZ);
      networkState.scene.add(notchFloor);

      // Extension floor (outside building) - from x=9.239 to x=10.239
      const extFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(notch.width, notch.depth),
        balconyFloorMat
      );
      extFloor.rotation.x = -Math.PI / 2;
      const extFloorX = (FLOOR_PLAN_CONFIG.apartmentWidth + notch.width / 2) - centerX;
      extFloor.position.set(extFloorX, 0.01, notchFloorZ);
      networkState.scene.add(extFloor);

      // Wall 16: North balcony wall (along z = 5.165, extends EAST from notch to outer edge)
      const northBalconyWall = new THREE.Mesh(
        new THREE.BoxGeometry(notch.width * 2, wallHeight, 0.08),  // Double width to cover notch + extension
        wallMat
      );
      const wall16CenterX = FLOOR_PLAN_CONFIG.apartmentWidth - centerX;  // Centered at building edge
      northBalconyWall.position.set(wall16CenterX, wallHeight / 2, balconyStartZ - centerZ);
      networkState.scene.add(northBalconyWall);
      networkState.wallMeshes.push(northBalconyWall);

      // Wall 17: West notch wall (along x = 8.239, from z=5.165 to z=6.665)
      const vertStepWallX = (FLOOR_PLAN_CONFIG.apartmentWidth - notch.width) - centerX;
      const westNotchWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, wallHeight, notch.depth),
        wallMat
      );
      westNotchWall.position.set(vertStepWallX, wallHeight / 2, notchFloorZ);
      networkState.scene.add(westNotchWall);
      networkState.wallMeshes.push(westNotchWall);

      // Balcony railings (if enabled) - same color as walls
      if (notch.hasRailing) {
        const railingHeight = 0.5;  // Lower than walls
        const railingThickness = 0.05;
        const railingMat = new THREE.MeshStandardMaterial({
          color: 0xB5A080,  // Same as other walls
          roughness: 0.7,
          transparent: true,
          opacity: 0.6
        });

        // Wall 18: East railing (outer edge at x = 10.239)
        const eastRailing = new THREE.Mesh(
          new THREE.BoxGeometry(railingThickness, railingHeight, notch.depth),
          railingMat
        );
        eastRailing.position.set(balconyOuterX - centerX, railingHeight / 2, notchFloorZ);
        networkState.scene.add(eastRailing);
        networkState.wallMeshes.push(eastRailing);

        // Wall 19: South balcony wall (along z = 6.665, extends EAST across notch + extension)
        const southBalconyWall = new THREE.Mesh(
          new THREE.BoxGeometry(notch.width * 2, railingHeight, railingThickness),  // Double width
          railingMat
        );
        southBalconyWall.position.set(wall16CenterX, railingHeight / 2, southWallZ - centerZ);
        networkState.scene.add(southBalconyWall);
        networkState.wallMeshes.push(southBalconyWall);

        // Corner posts at outer edge
        const cornerPost1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, railingHeight, 8),
          railingMat
        );
        cornerPost1.position.set(balconyOuterX - centerX, railingHeight / 2, balconyStartZ - centerZ);
        networkState.scene.add(cornerPost1);

        const cornerPost2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, railingHeight, 8),
          railingMat
        );
        cornerPost2.position.set(balconyOuterX - centerX, railingHeight / 2, southWallZ - centerZ);
        networkState.scene.add(cornerPost2);
      }

      // Door X markers - adding from FLOOR_PLAN_CONFIG.doors
      const doorMarkerMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const markerSize = 0.3;
      const markerThickness = 0.05;
      const markerHeight = 0.02;

      // Helper function to add door marker
      const addDoorMarker = (x, z) => {
        const posX = x - centerX;
        const posZ = z - centerZ;

        // Bar 1 (diagonal \)
        const bar1 = new THREE.Mesh(
          new THREE.BoxGeometry(markerSize, markerHeight, markerThickness),
          doorMarkerMat
        );
        bar1.rotation.y = Math.PI / 4;
        bar1.position.set(posX, markerHeight/2, posZ);
        networkState.scene.add(bar1);

        // Bar 2 (diagonal /)
        const bar2 = new THREE.Mesh(
          new THREE.BoxGeometry(markerSize, markerHeight, markerThickness),
          doorMarkerMat
        );
        bar2.rotation.y = -Math.PI / 4;
        bar2.position.set(posX, markerHeight/2, posZ);
        networkState.scene.add(bar2);
      };

      // Door 2: Living ↔ Hallway - on Wall 3 (Study↔Living divider at z=3.197)
      addDoorMarker(4.8, 3.197);

      // Door 3: Study door - on Wall 0 (study's left wall at x=5.331)
      addDoorMarker(5.331, 2.5);

      // Door 4: Bedroom ↔ Hallway - on Wall 3 (at x=3.8)
      addDoorMarker(3.8, 3.197);

      // Door 5: Kitchen door - on wall 10 (east wall upper at x=3.15)
      addDoorMarker(3.15, 2.5);

      // Door 6: Bathroom door - on wall 10 (east wall upper at x=3.15)
      addDoorMarker(3.15, 0.7);

      // Door 7: Main Entry - on north wall (z=0)
      addDoorMarker(4.0, 0);

      // ═══════════════════════════════════════════════════════════════
      // WINDOW X MARKERS - Blue X on floor (like door markers but blue)
      // ═══════════════════════════════════════════════════════════════
      const windowMarkerMat = new THREE.MeshBasicMaterial({ color: 0x0066FF });
      const winMarkerSize = 0.5;  // Larger than door markers

      const addWindowMarker = (x, z, index) => {
        // Offset x inside apartment for wall positions
        let actualX = x;
        if (x < 0.1) actualX = 0.5;  // West wall - offset 0.5m inside
        if (x > FLOOR_PLAN_CONFIG.apartmentWidth - 0.1) actualX = FLOOR_PLAN_CONFIG.apartmentWidth - 0.5;  // East wall

        const posX = actualX - centerX;
        const posZ = z - centerZ;

        // Bar 1 (diagonal \) - flat on floor
        const bar1 = new THREE.Mesh(
          new THREE.BoxGeometry(winMarkerSize, 0.05, 0.08),
          windowMarkerMat
        );
        bar1.rotation.y = Math.PI / 4;
        bar1.position.set(posX, 0.03, posZ);
        networkState.scene.add(bar1);

        // Bar 2 (diagonal /) - flat on floor
        const bar2 = new THREE.Mesh(
          new THREE.BoxGeometry(winMarkerSize, 0.05, 0.08),
          windowMarkerMat
        );
        bar2.rotation.y = -Math.PI / 4;
        bar2.position.set(posX, 0.03, posZ);
        networkState.scene.add(bar2);

        // Window number label (blue circle with W#)
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('W' + index, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(0.6, 0.6, 1);
        label.position.set(posX, 0.6, posZ);
        networkState.scene.add(label);
      };

      // Add window markers from config
      FLOOR_PLAN_CONFIG.windows.forEach((win, i) => {
        addWindowMarker(win.x, win.z, i + 1);
      });

      // ═══════════════════════════════════════════════════════════════
      // COMPASS DIRECTION LABELS - N/S/E/W outside the building
      // ═══════════════════════════════════════════════════════════════
      const halfW = FLOOR_PLAN_CONFIG.apartmentWidth / 2;
      const halfD = FLOOR_PLAN_CONFIG.apartmentDepth / 2;
      const compassOffset = 1.0;  // Distance outside building

      const compassLabels = [
        { label: 'N', x: 0, z: -halfD - compassOffset, color: '#2563EB' },  // North (blue)
        { label: 'S', x: 0, z: halfD + compassOffset, color: '#DC2626' },   // South (red)
        { label: 'W', x: -halfW - compassOffset, z: 0, color: '#059669' },  // West (green)
        { label: 'E', x: halfW + compassOffset, z: 0, color: '#D97706' }    // East (orange)
      ];

      compassLabels.forEach(({ label, x, z, color }) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Circle background
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();

        // White letter
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.8, 0.8, 1);
        sprite.position.set(x, 0.5, z);
        networkState.scene.add(sprite);
      });
    },

    createRoom(config) {
      const group = new THREE.Group();
      const floorColor = 0xC9B89A;  // Warm beige
      const wallColor = 0xB5A080;
      const wallHeight = 0.8;

      // Correct center coordinates (x,z are already center positions)
      const centerX = FLOOR_PLAN_CONFIG.apartmentWidth / 2;
      const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;
      const rx = config.x - centerX;
      const rz = config.z - centerZ;

      // Room floor at correct position
      const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.8 });
      let floor;

      // Special L-shaped floor for living room (balcony notch cut-out)
      if (config.id === 'living' && FLOOR_PLAN_CONFIG.balconyNotch) {
        const notch = FLOOR_PLAN_CONFIG.balconyNotch;
        const w = config.width;
        const d = config.depth;

        // Create L-shape: rectangle with southwest corner cut out
        // Shape coordinates are relative to room center
        const shape = new THREE.Shape();
        // Start at southwest corner of main room (after notch)
        shape.moveTo(-w/2 + notch.width, -d/2);
        // Go east along south edge
        shape.lineTo(w/2, -d/2);
        // Go north along east edge
        shape.lineTo(w/2, d/2);
        // Go west along north edge
        shape.lineTo(-w/2, d/2);
        // Go south along west edge (partial - stop at notch)
        shape.lineTo(-w/2, -d/2 + notch.depth);
        // Go east to notch inner corner
        shape.lineTo(-w/2 + notch.width, -d/2 + notch.depth);
        // Go south to close the shape
        shape.lineTo(-w/2 + notch.width, -d/2);

        const floorGeom = new THREE.ShapeGeometry(shape);
        floor = new THREE.Mesh(floorGeom, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(rx, 0.01, rz);
      } else {
        // Standard rectangular floor for other rooms
        const floorGeom = new THREE.PlaneGeometry(config.width, config.depth);
        floor = new THREE.Mesh(floorGeom, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(rx, 0.01, rz);
      }
      floor.receiveShadow = true;
      group.add(floor);

      // Helipad-style room label on floor
      const helipadSize = Math.min(config.width, config.depth) * 0.6;
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Outer circle
      ctx.strokeStyle = 'rgba(90, 70, 50, 0.4)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(128, 128, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circle
      ctx.strokeStyle = 'rgba(90, 70, 50, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(128, 128, 85, 0, Math.PI * 2);
      ctx.stroke();

      // Room name text
      ctx.fillStyle = 'rgba(90, 70, 50, 0.5)';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.name.toUpperCase(), 128, 128);

      const helipadTexture = new THREE.CanvasTexture(canvas);
      const helipadGeom = new THREE.PlaneGeometry(helipadSize, helipadSize);
      const helipadMat = new THREE.MeshBasicMaterial({
        map: helipadTexture,
        transparent: true,
        depthWrite: false
      });
      const helipad = new THREE.Mesh(helipadGeom, helipadMat);
      helipad.rotation.x = -Math.PI / 2;
      helipad.position.set(rx, 0.02, rz);
      group.add(helipad);

      // Create all 4 walls automatically
      const halfW = config.width / 2;
      const halfD = config.depth / 2;
      const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7, transparent: true, opacity: 0.6 });

      // Back wall (north) - skip for all rooms at z=0 edge (consolidated into single north wall)
      // Only bathroom has a front wall (interior divider at z=1.504)
      // Study, Living, Bedroom, Kitchen, Bathroom back walls are all consolidated
      if (false) {  // All back walls consolidated into single north wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(config.width, wallHeight, 0.08), wallMat);
        backWall.position.set(rx, wallHeight/2, rz - halfD);
        group.add(backWall);
        networkState.wallMeshes.push(backWall);
      }

      // Front wall (south) - skip for study, kitchen, bedroom, living (consolidated into single south wall)
      if (config.id !== 'study' && config.id !== 'kitchen' && config.id !== 'bedroom' && config.id !== 'living') {
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(config.width, wallHeight, 0.08), wallMat);
        frontWall.position.set(rx, wallHeight/2, rz + halfD);
        group.add(frontWall);
        networkState.wallMeshes.push(frontWall);
      }

      // Left wall (west) - skip for living room and west-edge rooms (single west wall created in buildFloorPlan)
      const roomAtWestEdge = ['bathroom', 'kitchen', 'bedroom'].includes(config.id);
      if (config.id !== 'living' && !roomAtWestEdge) {
        // For study, use studyFrontZ (3.197) to join Wall 3
        // Split into 2 segments with door opening at z=1.85
        if (config.id === 'study') {
          const studyObj = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'study');
          const studyFrontZ = studyObj.z + studyObj.depth/2 - 0.5;  // 3.197 (joins Wall 3)
          const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;

          // Door opening parameters
          const doorZ = 2.5;  // Door center position (towards living room)
          const doorWidth = 0.42;  // Same as other doors
          const doorTop = doorZ - doorWidth/2;  // 1.64
          const doorBottom = doorZ + doorWidth/2;  // 2.06

          // Segment 1: from z=0 to door top edge
          const seg1Depth = doorTop;  // 1.64
          const seg1CenterZ = seg1Depth/2 - centerZ;
          const leftWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, seg1Depth), wallMat);
          leftWall1.position.set(rx - halfW, wallHeight/2, seg1CenterZ);
          leftWall1.userData = { roomId: config.id, side: 'left' };
          group.add(leftWall1);
          networkState.wallMeshes.push(leftWall1);

          // Segment 2: from door bottom edge to studyFrontZ
          const seg2Depth = studyFrontZ - doorBottom;  // 3.197 - 2.06 = 1.137
          const seg2CenterZ = (doorBottom + studyFrontZ)/2 - centerZ;
          const leftWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, seg2Depth), wallMat);
          leftWall2.position.set(rx - halfW, wallHeight/2, seg2CenterZ);
          leftWall2.userData = { roomId: config.id, side: 'left' };
          group.add(leftWall2);
          networkState.wallMeshes.push(leftWall2);
        } else {
          const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, config.depth), wallMat);
          leftWall.position.set(rx - halfW, wallHeight/2, rz);
          leftWall.userData = { roomId: config.id, side: 'left' };
          group.add(leftWall);
          networkState.wallMeshes.push(leftWall);
        }
      }

      // Right wall (east) - skip for rooms using consolidated east walls
      // Bathroom, Kitchen → consolidated into east wall upper (Wall 8)
      // Study, Living → consolidated into east wall lower (Wall 9)
      // Only Bedroom keeps its individual right wall (divider between bedroom and living)
      const roomsWithConsolidatedEastWall = ['bathroom', 'kitchen', 'study', 'living'];
      if (!roomsWithConsolidatedEastWall.includes(config.id)) {
        if (config.id === 'bedroom') {
          // Bedroom's right wall (Wall 1) serves as divider between bedroom and living
          // Extends from studyFrontZ (z=3.197) to south edge (z=7.665) - joins Wall 3
          const study = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'study');
          const wall15Z = study.z + study.depth/2 - 0.5;  // 3.197 (same as Wall 3, joins it)
          const bedroomFrontZ = config.z + config.depth/2;  // 7.665 (apartment south edge)
          const extendedDepth = bedroomFrontZ - wall15Z;  // 4.468 (extended to join Wall 3)
          const extendedCenterZ = (wall15Z + bedroomFrontZ) / 2 - FLOOR_PLAN_CONFIG.apartmentDepth / 2;

          // Position moved towards living room (increased x by 0.8m)
          const bathroom = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === 'bathroom');
          const wall7X = bathroom.x + bathroom.width/2 + 0.8 - FLOOR_PLAN_CONFIG.apartmentWidth / 2;

          const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, extendedDepth), wallMat);
          rightWall.position.set(wall7X, wallHeight/2, extendedCenterZ);
          group.add(rightWall);
          networkState.wallMeshes.push(rightWall);
        } else {
          // Default right wall for any other rooms
          const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, config.depth), wallMat);
          rightWall.position.set(rx + halfW, wallHeight/2, rz);
          group.add(rightWall);
          networkState.wallMeshes.push(rightWall);
        }
      }

      // Furniture
      this.createFurniture(group, config, rx, rz);

      networkState.scene.add(group);
      networkState.roomMeshes[config.id] = { group, floor, config };
    },

    createFurniture(group, config, rx, rz) {
      const furnitureColor = 0xBFA98A;
      const furnitureMat = new THREE.MeshStandardMaterial({ color: furnitureColor, roughness: 0.6 });

      if (config.id === 'bedroom') {
        // Bed
        const bedGeom = new THREE.BoxGeometry(1.4, 0.3, 2.0);
        const bed = new THREE.Mesh(bedGeom, furnitureMat);
        bed.position.set(rx - config.width/4, 0.15, rz);
        group.add(bed);
      } else if (config.id === 'living') {
        // Sofa
        const sofaGeom = new THREE.BoxGeometry(2.0, 0.4, 0.8);
        const sofa = new THREE.Mesh(sofaGeom, furnitureMat);
        sofa.position.set(rx, 0.2, rz + config.depth/4);
        group.add(sofa);
      } else if (config.id === 'study') {
        // Desk
        const deskGeom = new THREE.BoxGeometry(1.2, 0.5, 0.6);
        const desk = new THREE.Mesh(deskGeom, furnitureMat);
        desk.position.set(rx + config.width/4, 0.25, rz - config.depth/4);
        group.add(desk);
      }
    },

    createDevices() {
      networkState.deviceMeshes = {};
      const centerX = FLOOR_PLAN_CONFIG.apartmentWidth / 2;
      const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;

      ZIGBEE_DEVICES.forEach(device => {
        // Create device marker (sphere)
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        let color;
        switch (device.type) {
          case 'coordinator': color = 0xFF6B6B; break;
          case 'router': color = 0x4DABF7; break;
          default: color = 0x51CF66;
        }
        const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
        const mesh = new THREE.Mesh(geometry, material);

        // Position based on room (room.x, room.z are center coords)
        const room = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === device.room);
        if (room) {
          const roomCenterX = room.x - centerX;
          const roomCenterZ = room.z - centerZ;  // FIX: use z not y
          mesh.position.set(
            roomCenterX + (device.x - 0.5) * room.width * 0.8,
            0.5,
            roomCenterZ + (device.z - 0.5) * room.depth * 0.8
          );
        }

        mesh.castShadow = true;
        networkState.scene.add(mesh);
        networkState.deviceMeshes[device.id] = { mesh, config: device };
      });
    },

    createLabels(container) {
      // Clear existing labels
      Object.values(networkState.labelElements).forEach(el => el?.remove());
      Object.values(networkState.signalElements).forEach(el => el?.remove());
      networkState.labelElements = {};
      networkState.signalElements = {};

      ZIGBEE_DEVICES.forEach(device => {
        // Device label
        const label = document.createElement('div');
        label.className = 'device-label visible';
        label.innerHTML = `
          <div class="device-icon ${device.type}">${device.icon}</div>
          <div class="device-name">${device.name}</div>
        `;
        container.appendChild(label);
        networkState.labelElements[device.id] = label;

        // Signal range circle (for coordinator and routers)
        if (device.type === 'coordinator' || device.type === 'router') {
          const signal = document.createElement('div');
          signal.className = `signal-range ${device.type}`;
          signal.style.width = device.type === 'coordinator' ? '200px' : '150px';
          signal.style.height = device.type === 'coordinator' ? '200px' : '150px';
          container.appendChild(signal);
          networkState.signalElements[device.id] = signal;
        }
      });
    },

    updateLabels() {
      const container = this.$refs.networkContainer;
      if (!container || !networkState.camera) return;

      ZIGBEE_DEVICES.forEach(device => {
        const deviceData = networkState.deviceMeshes[device.id];
        const label = networkState.labelElements[device.id];
        const signal = networkState.signalElements[device.id];

        if (!deviceData || !label) return;

        const pos = deviceData.mesh.position.clone();
        pos.y += 0.3;
        pos.project(networkState.camera);

        const x = (pos.x * 0.5 + 0.5) * container.clientWidth;
        const y = (-pos.y * 0.5 + 0.5) * container.clientHeight;

        label.style.left = x + 'px';
        label.style.top = y + 'px';
        label.style.display = this.showLabels ? 'flex' : 'none';

        if (signal) {
          signal.style.left = x + 'px';
          signal.style.top = (y + 40) + 'px';
          signal.style.display = this.showSignalRange ? 'block' : 'none';
        }
      });
    },

    setupPanControls(container) {
      container.addEventListener('pointerdown', (e) => {
        if (this.autoRotate) return;
        networkState.isPanning = true;
        networkState.lastPanPos = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
      });

      container.addEventListener('pointermove', (e) => {
        if (!networkState.isPanning) return;
        const dx = e.clientX - networkState.lastPanPos.x;
        const dy = e.clientY - networkState.lastPanPos.y;
        networkState.panOffset.x -= dx * 0.02;
        networkState.panOffset.z -= dy * 0.02;
        networkState.camera.lookAt(networkState.panOffset.x, 0, networkState.panOffset.z);
        networkState.lastPanPos = { x: e.clientX, y: e.clientY };
      });

      container.addEventListener('pointerup', () => {
        networkState.isPanning = false;
        container.style.cursor = 'grab';
      });

      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.zoomLevel * delta);
      }, { passive: false });
    },

    setZoom(level) {
      this.zoomLevel = Math.max(0.5, Math.min(3.0, level));
      this.updateCameraZoom();
    },

    updateCameraZoom() {
      const container = this.$refs.networkContainer;
      if (!container || !networkState.camera) return;
      const aspect = container.clientWidth / container.clientHeight;
      const frustumSize = 15 / this.zoomLevel;
      networkState.camera.left = frustumSize * aspect / -2;
      networkState.camera.right = frustumSize * aspect / 2;
      networkState.camera.top = frustumSize / 2;
      networkState.camera.bottom = frustumSize / -2;
      networkState.camera.updateProjectionMatrix();
    },

    zoomIn() { this.setZoom(this.zoomLevel * 1.2); },
    zoomOut() { this.setZoom(this.zoomLevel / 1.2); },

    resetView() {
      this.zoomLevel = 1.0;
      this.autoRotate = false;
      this.rotationAngle = Math.PI / 4;
      networkState.panOffset = { x: 0, z: 0 };
      networkState.camera.position.set(10, 10, 10);
      networkState.camera.lookAt(0, 0, 0);
      this.updateCameraZoom();
    },

    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate;
      if (this.autoRotate) {
        const pos = networkState.camera.position;
        this.rotationAngle = Math.atan2(pos.x, pos.z);
      }
    },

    animate() {
      const self = this;
      const radius = 17.32;
      const height = 10;

      function loop() {
        networkState.animationId = requestAnimationFrame(loop);

        if (self.autoRotate && networkState.camera) {
          self.rotationAngle += 0.003;
          const x = Math.sin(self.rotationAngle) * radius;
          const z = Math.cos(self.rotationAngle) * radius;
          networkState.camera.position.set(x, height, z);
          networkState.camera.lookAt(networkState.panOffset.x, 0, networkState.panOffset.z);
        }

        self.updateLabels();
        if (networkState.renderer && networkState.scene && networkState.camera) {
          networkState.renderer.render(networkState.scene, networkState.camera);
        }
      }
      loop();
    },

    onResize() {
      const container = this.$refs.networkContainer;
      if (!container || !networkState.camera || !networkState.renderer) return;
      const aspect = container.clientWidth / container.clientHeight;
      const frustumSize = 15 / this.zoomLevel;
      networkState.camera.left = frustumSize * aspect / -2;
      networkState.camera.right = frustumSize * aspect / 2;
      networkState.camera.top = frustumSize / 2;
      networkState.camera.bottom = frustumSize / -2;
      networkState.camera.updateProjectionMatrix();
      networkState.renderer.setSize(container.clientWidth, container.clientHeight);
    },

    getZoomPercent() { return Math.round(this.zoomLevel * 100); }
  };
}
