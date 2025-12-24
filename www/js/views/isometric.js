/**
 * Isometric Floor Plan View
 * Fixed-angle orthographic visualization of apartment with heat map
 * Clean, dashboard-style view for monitoring sensors
 */

import { interpolateColor, getRoomColor } from '../three/color-utils.js';
import { applyDarkTheme, setWallsVisibility } from '../three/theme-utils.js';
import { createScene, createRenderer, createOrthographicCamera, addLighting, cleanupThreeState } from '../three/scene-init.js';
import { createRoom as buildRoom } from '../three/room-builder.js';
import { createStandardDoor, createFrenchDoor, createWindow as buildWindow, createBalconyRailing } from '../three/openings.js';

// Store Three.js objects OUTSIDE Alpine to avoid proxy conflicts
const isoState = {
  scene: null,
  camera: null,
  renderer: null,
  roomMeshes: {},
  wallMeshes: [],
  labelElements: {},
  animationId: null,
  isInitialized: false,
  // Pan state
  panOffset: { x: 0, z: 0 },
  isPanning: false,
  lastPanPos: { x: 0, y: 0 }
};

/**
 * Creates the Isometric floor plan view component
 * @param {Object} FLOOR_PLAN_CONFIG - Floor plan configuration with room dimensions
 * @param {Array} TEMP_COLORS - Temperature color scale
 * @param {Array} HUMIDITY_COLORS - Humidity color scale
 */
export function isometricView(FLOOR_PLAN_CONFIG, TEMP_COLORS, HUMIDITY_COLORS) {
  // Calculate center for positioning
  const centerX = FLOOR_PLAN_CONFIG.apartmentWidth / 2;
  const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;

  return {
    // Reactive state for UI
    viewMode: 'temperature',
    zoomLevel: 1.0,
    wallsVisible: true,
    darkTheme: false,

    init() {
      // Wait for container to become visible and have dimensions
      this.waitForContainer();
    },

    waitForContainer() {
      const container = this.$refs.isoContainer;

      // If container doesn't exist or has no dimensions, retry
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.waitForContainer(), 100);
        return;
      }

      // If already initialized, ensure canvas is in container and resize
      if (isoState.isInitialized && isoState.renderer) {
        // Re-attach canvas if it's not in the container
        if (!container.contains(isoState.renderer.domElement)) {
          container.appendChild(isoState.renderer.domElement);
        }
        this.createLabels(container);
        this.onResize();
        return;
      }

      // Clean up any existing Three.js objects
      cleanupThreeState(isoState);

      this.initScene();
      this.initCamera(container);
      this.initRenderer(container);
      this.initLighting();
      this.buildFloorPlan();
      this.createLabels(container);
      this.setupPanControls(container);
      this.animate();
      isoState.isInitialized = true;

      window.addEventListener('resize', () => this.onResize());
    },

    initScene() {
      isoState.scene = createScene(0xE8E8EA);
    },

    initCamera(container) {
      isoState.camera = createOrthographicCamera(container, 15, { x: 10, y: 10, z: 10 });
    },

    initRenderer(container) {
      isoState.renderer = createRenderer(container);
    },

    initLighting() {
      addLighting(isoState.scene, { enableShadows: true });
    },

    buildFloorPlan() {
      // Clear wall meshes array for fresh build
      isoState.wallMeshes = [];

      // Base floor
      const apW = FLOOR_PLAN_CONFIG.apartmentWidth;
      const apD = FLOOR_PLAN_CONFIG.apartmentDepth;
      const floorGeometry = new THREE.PlaneGeometry(apW + 2, apD + 2);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C2,
        roughness: 0.8
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.01, 0);
      floor.receiveShadow = true;
      isoState.scene.add(floor);

      // Build each room
      FLOOR_PLAN_CONFIG.rooms.forEach(roomConfig => {
        const roomGroup = this.createRoom(roomConfig);
        isoState.roomMeshes[roomConfig.id] = roomGroup;
        isoState.scene.add(roomGroup);
      });

      // Hallway floor
      const hw = FLOOR_PLAN_CONFIG.hallway;
      const hallwayGeometry = new THREE.PlaneGeometry(hw.width, hw.depth);
      const hallwayMaterial = new THREE.MeshStandardMaterial({
        color: 0xD0D0D0,
        roughness: 0.7
      });
      const hallway = new THREE.Mesh(hallwayGeometry, hallwayMaterial);
      hallway.rotation.x = -Math.PI / 2;
      hallway.position.set(hw.x - centerX, 0.005, hw.z - centerZ);
      hallway.receiveShadow = true;
      isoState.scene.add(hallway);

      // Balcony floor
      const bal = FLOOR_PLAN_CONFIG.balcony;
      const balconyGeometry = new THREE.PlaneGeometry(bal.width, bal.depth);
      const balconyMaterial = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.5
      });
      const balcony = new THREE.Mesh(balconyGeometry, balconyMaterial);
      balcony.rotation.x = -Math.PI / 2;
      balcony.position.set(bal.x - centerX, 0.003, bal.z - centerZ);
      balcony.receiveShadow = true;
      isoState.scene.add(balcony);

      // Add doors
      FLOOR_PLAN_CONFIG.doors.forEach(door => this.createDoor(door));

      // Add windows
      FLOOR_PLAN_CONFIG.windows.forEach(win => this.createWindow(win));

      // Add balcony railing
      this.createBalconyRailing();

      // Add furniture
      this.createFurniture();
    },

    createRoom(config) {
      const result = buildRoom(config, centerX, centerZ, FLOOR_PLAN_CONFIG.wallHeight);
      result.walls.forEach(wall => isoState.wallMeshes.push(wall));
      return result.group;
    },

    createDoor(doorConfig) {
      const wallHeight = FLOOR_PLAN_CONFIG.wallHeight;
      let meshes;
      if (doorConfig.type === 'french') {
        meshes = createFrenchDoor(doorConfig, centerX, centerZ, wallHeight);
      } else {
        meshes = createStandardDoor(doorConfig, centerX, centerZ, wallHeight);
      }
      meshes.forEach(m => isoState.scene.add(m));
    },

    createWindow(winConfig) {
      const meshes = buildWindow(winConfig, centerX, centerZ, FLOOR_PLAN_CONFIG.wallHeight);
      meshes.forEach(m => isoState.scene.add(m));
    },

    createBalconyRailing() {
      const meshes = createBalconyRailing(FLOOR_PLAN_CONFIG.balcony, centerX, centerZ);
      meshes.forEach(m => isoState.scene.add(m));
    },

    createFurniture() {
      const furnitureMaterial = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.6,
        metalness: 0.1
      });

      FLOOR_PLAN_CONFIG.furniture.forEach(item => {
        const roomConfig = FLOOR_PLAN_CONFIG.rooms.find(r => r.id === item.room);
        if (!roomConfig) return;

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, item.height, item.depth),
          furnitureMaterial
        );
        mesh.position.set(
          roomConfig.x - centerX,
          item.height / 2,
          roomConfig.z - centerZ
        );
        mesh.castShadow = true;
        isoState.scene.add(mesh);

        // Add bedding for bed
        if (item.type === 'bed') {
          const beddingMaterial = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.8
          });
          const bedding = new THREE.Mesh(
            new THREE.BoxGeometry(item.width * 0.95, 0.1, item.depth * 0.8),
            beddingMaterial
          );
          bedding.position.set(
            roomConfig.x - centerX,
            item.height + 0.05,
            roomConfig.z - centerZ
          );
          isoState.scene.add(bedding);
        }
      });
    },

    // Pan & Zoom Controls
    setupPanControls(container) {
      // Pointer down - start panning
      container.addEventListener('pointerdown', (e) => {
        isoState.isPanning = true;
        isoState.lastPanPos = { x: e.clientX, y: e.clientY };
        container.setPointerCapture(e.pointerId);
        container.style.cursor = 'grabbing';
      });

      // Pointer move - update pan
      container.addEventListener('pointermove', (e) => {
        if (!isoState.isPanning) return;

        const dx = e.clientX - isoState.lastPanPos.x;
        const dy = e.clientY - isoState.lastPanPos.y;

        // Convert screen delta to world delta (adjusted for isometric angle)
        const panSpeed = 0.02 / this.zoomLevel;
        isoState.panOffset.x -= (dx - dy) * panSpeed * 0.7;
        isoState.panOffset.z -= (dx + dy) * panSpeed * 0.7;

        // Update camera target
        isoState.camera.lookAt(
          isoState.panOffset.x,
          0,
          isoState.panOffset.z
        );

        isoState.lastPanPos = { x: e.clientX, y: e.clientY };
      });

      // Pointer up - end panning
      container.addEventListener('pointerup', (e) => {
        isoState.isPanning = false;
        container.releasePointerCapture(e.pointerId);
        container.style.cursor = 'grab';
      });

      // Pointer leave - end panning
      container.addEventListener('pointerleave', () => {
        isoState.isPanning = false;
        container.style.cursor = 'grab';
      });

      // Wheel - zoom
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.zoomLevel * zoomDelta);
      }, { passive: false });
    },

    setZoom(level) {
      this.zoomLevel = Math.max(0.5, Math.min(3.0, level));
      this.updateCameraZoom();
    },

    updateCameraZoom() {
      const container = this.$refs.isoContainer;
      if (!container || !isoState.camera) return;

      const aspect = container.clientWidth / container.clientHeight;
      const frustumSize = 15 / this.zoomLevel;

      isoState.camera.left = frustumSize * aspect / -2;
      isoState.camera.right = frustumSize * aspect / 2;
      isoState.camera.top = frustumSize / 2;
      isoState.camera.bottom = frustumSize / -2;
      isoState.camera.updateProjectionMatrix();
    },

    zoomIn() {
      this.setZoom(this.zoomLevel * 1.2);
    },

    zoomOut() {
      this.setZoom(this.zoomLevel / 1.2);
    },

    resetView() {
      this.zoomLevel = 1.0;
      isoState.panOffset = { x: 0, z: 0 };
      isoState.camera.lookAt(0, 0, 0);
      this.updateCameraZoom();
    },

    // Labels
    createLabels(container) {
      // Clear existing labels
      Object.values(isoState.labelElements).forEach(label => {
        if (label && label.parentNode) {
          label.parentNode.removeChild(label);
        }
      });
      isoState.labelElements = {};

      // Remove orphaned labels
      container.querySelectorAll('.iso-label').forEach(el => el.remove());

      FLOOR_PLAN_CONFIG.rooms.forEach(roomConfig => {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'iso-label';
        labelDiv.innerHTML = `
          <div class="label-name">${roomConfig.icon} ${roomConfig.name}</div>
          <div class="label-value" data-room="${roomConfig.id}">--</div>
          <div class="label-secondary" data-room-secondary="${roomConfig.id}">--</div>
        `;
        container.appendChild(labelDiv);
        isoState.labelElements[roomConfig.id] = labelDiv;
      });
    },

    updateLabels() {
      const container = this.$refs.isoContainer;
      if (!container || !isoState.camera) return;

      const rooms = Alpine.store('rooms')?.list || [];
      const viewMode = this.viewMode;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      FLOOR_PLAN_CONFIG.rooms.forEach(config => {
        const label = isoState.labelElements[config.id];
        if (!label) return;

        const roomData = rooms.find(r => r.id === config.id);
        const valueEl = label.querySelector(`[data-room="${config.id}"]`);
        const secondaryEl = label.querySelector(`[data-room-secondary="${config.id}"]`);

        if (valueEl && roomData) {
          if (viewMode === 'temperature') {
            valueEl.textContent = roomData.temperature !== null
              ? `${roomData.temperature.toFixed(1)}°` : '--';
            if (secondaryEl) {
              secondaryEl.textContent = roomData.humidity !== null
                ? `${roomData.humidity.toFixed(0)}%` : '';
            }
          } else {
            valueEl.textContent = roomData.humidity !== null
              ? `${roomData.humidity.toFixed(0)}%` : '--';
            if (secondaryEl) {
              secondaryEl.textContent = roomData.temperature !== null
                ? `${roomData.temperature.toFixed(1)}°` : '';
            }
          }
        }

        // Project 3D to 2D
        const position = new THREE.Vector3(
          config.x - centerX,
          config.labelY || 3,
          config.z - centerZ
        );
        position.project(isoState.camera);

        const x = (position.x * 0.5 + 0.5) * containerWidth;
        const y = (-position.y * 0.5 + 0.5) * containerHeight;

        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        // Show label if within bounds
        const margin = 20;
        const isVisible = containerWidth > 0 && containerHeight > 0 &&
                          x > margin && x < containerWidth - margin &&
                          y > margin && y < containerHeight - margin;

        if (isVisible) {
          label.classList.add('visible');
        } else {
          label.classList.remove('visible');
        }
      });
    },

    updateRoomColors() {
      const rooms = Alpine.store('rooms')?.list || [];
      const viewMode = this.viewMode;

      rooms.forEach(roomData => {
        const meshGroup = isoState.roomMeshes[roomData.id];
        if (!meshGroup) return;

        const floorMesh = meshGroup.children.find(child =>
          child.name === 'floor_' + roomData.id
        );

        if (floorMesh && floorMesh.material) {
          const color = this.getRoomColor(roomData, viewMode);
          floorMesh.material.color.setHex(color);
        }
      });
    },

    getRoomColor(room, viewMode) {
      return getRoomColor(room, viewMode, TEMP_COLORS, HUMIDITY_COLORS);
    },

    interpolateColor(value, scale) {
      return interpolateColor(value, scale);
    },

    toggleWalls() {
      this.wallsVisible = !this.wallsVisible;
      setWallsVisibility(isoState.wallMeshes, this.wallsVisible);
    },

    toggleDarkTheme() {
      this.darkTheme = !this.darkTheme;
      applyDarkTheme(isoState.scene, this.darkTheme);
    },

    animate() {
      const self = this;
      function loop() {
        isoState.animationId = requestAnimationFrame(loop);

        self.updateRoomColors();
        self.updateLabels();

        if (isoState.renderer && isoState.scene && isoState.camera) {
          isoState.renderer.render(isoState.scene, isoState.camera);
        }
      }
      loop();
    },

    onResize() {
      const container = this.$refs.isoContainer;
      if (!container || !isoState.camera || !isoState.renderer) return;

      const aspect = container.clientWidth / container.clientHeight;
      const frustumSize = 15 / this.zoomLevel;

      // Update OrthographicCamera frustum
      isoState.camera.left = frustumSize * aspect / -2;
      isoState.camera.right = frustumSize * aspect / 2;
      isoState.camera.top = frustumSize / 2;
      isoState.camera.bottom = frustumSize / -2;
      isoState.camera.updateProjectionMatrix();

      isoState.renderer.setSize(container.clientWidth, container.clientHeight);
    },

    setViewMode(mode) {
      this.viewMode = mode;
    },

    getZoomPercent() {
      return Math.round(this.zoomLevel * 100);
    }
  };
}
