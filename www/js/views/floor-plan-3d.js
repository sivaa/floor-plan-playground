/**
 * Vision 8: 3D Floor Plan View
 * Interactive Three.js visualization of apartment with temperature heat map
 */

import { interpolateColor, getRoomColor } from '../three/color-utils.js';
import { applyDarkTheme, setWallsVisibility } from '../three/theme-utils.js';
import { createScene, createRenderer, createOrbitCamera, addLighting, cleanupThreeState } from '../three/scene-init.js';
import { createRoom as buildRoom } from '../three/room-builder.js';
import { createStandardDoor, createFrenchDoor, createWindow as buildWindow, createBalconyRailing } from '../three/openings.js';

// Store Three.js objects OUTSIDE Alpine to avoid proxy conflicts
const threeState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  roomMeshes: {},
  wallMeshes: [],
  labelElements: {},
  animationId: null,
  isInitialized: false
};

/**
 * Creates the 3D floor plan view component
 * @param {Object} FLOOR_PLAN_CONFIG - Floor plan configuration with room dimensions
 * @param {Array} TEMP_COLORS - Temperature color scale
 * @param {Array} HUMIDITY_COLORS - Humidity color scale
 * @param {Object} OrbitControls - Three.js OrbitControls class
 */
export function threeDView(FLOOR_PLAN_CONFIG, TEMP_COLORS, HUMIDITY_COLORS, OrbitControls) {
  // Calculate center for positioning
  const centerX = FLOOR_PLAN_CONFIG.apartmentWidth / 2;
  const centerZ = FLOOR_PLAN_CONFIG.apartmentDepth / 2;

  return {
    // Reactive state for UI
    viewMode: 'temperature',
    viewMode3D: 'top',
    wallsVisible: true,
    autoRotate: false,
    darkTheme: false,

    init() {
      // Wait for container to become visible and have dimensions
      this.waitForContainer();
    },

    waitForContainer() {
      const container = this.$refs.threeContainer;

      // If container doesn't exist or has no dimensions, retry
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.waitForContainer(), 100);
        return;
      }

      // If already initialized, ensure canvas is in container and resize
      if (threeState.isInitialized && threeState.renderer) {
        // Re-attach canvas if it's not in the container
        if (!container.contains(threeState.renderer.domElement)) {
          container.appendChild(threeState.renderer.domElement);
        }
        this.createLabels(container);  // Recreate labels
        this.onResize();
        return;
      }

      // Clean up any existing Three.js objects
      cleanupThreeState(threeState);

      this.initScene();
      this.initCamera(container, OrbitControls);
      this.initRenderer(container);
      this.initLighting();
      this.buildFloorPlan();
      this.createLabels(container);
      this.animate();
      threeState.isInitialized = true;

      window.addEventListener('resize', () => this.onResize());
    },

    initScene() {
      threeState.scene = createScene(0xE8E8EA);
    },

    initCamera(container, OrbitControls) {
      const result = createOrbitCamera(container, OrbitControls, {
        position: { x: 0, y: 14, z: -0.1 },
        maxDistance: 40
      });
      threeState.camera = result.camera;
      threeState.controls = result.controls;
    },

    initRenderer(container) {
      threeState.renderer = createRenderer(container);
    },

    initLighting() {
      addLighting(threeState.scene, { enableShadows: true });
    },

    buildFloorPlan() {
      // Clear wall meshes array for fresh build
      threeState.wallMeshes = [];

      // Base floor - uses apartment dimensions, centered at origin
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
      threeState.scene.add(floor);

      // Build each room
      FLOOR_PLAN_CONFIG.rooms.forEach(roomConfig => {
        const roomGroup = this.createRoom(roomConfig);
        threeState.roomMeshes[roomConfig.id] = roomGroup;
        threeState.scene.add(roomGroup);
      });

      // Hallway floor (centered coordinates)
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
      threeState.scene.add(hallway);

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
      threeState.scene.add(balcony);

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
      result.walls.forEach(wall => threeState.wallMeshes.push(wall));
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
      meshes.forEach(m => threeState.scene.add(m));
    },

    createWindow(winConfig) {
      const meshes = buildWindow(winConfig, centerX, centerZ, FLOOR_PLAN_CONFIG.wallHeight);
      meshes.forEach(m => threeState.scene.add(m));
    },

    createBalconyRailing() {
      const meshes = createBalconyRailing(FLOOR_PLAN_CONFIG.balcony, centerX, centerZ);
      meshes.forEach(m => threeState.scene.add(m));
    },

    // Create furniture
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
        threeState.scene.add(mesh);

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
          threeState.scene.add(bedding);
        }
      });
    },

    createLabels(container) {
      // Clear any existing labels first
      Object.values(threeState.labelElements).forEach(label => {
        if (label && label.parentNode) {
          label.parentNode.removeChild(label);
        }
      });
      threeState.labelElements = {};

      // Also remove any orphaned labels
      container.querySelectorAll('.room-3d-label').forEach(el => el.remove());

      FLOOR_PLAN_CONFIG.rooms.forEach(roomConfig => {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'room-3d-label';
        labelDiv.innerHTML = `
          <div class="label-icon">${roomConfig.icon}</div>
          <div class="label-name">${roomConfig.name}</div>
          <div class="label-value" data-room="${roomConfig.id}">--</div>
          <div class="label-secondary" data-room-secondary="${roomConfig.id}">--</div>
        `;
        container.appendChild(labelDiv);
        threeState.labelElements[roomConfig.id] = labelDiv;
      });
    },

    updateLabels() {
      const container = this.$refs.threeContainer;
      if (!container || !threeState.camera) return;

      const rooms = Alpine.store('rooms')?.list || [];
      const viewMode = this.viewMode;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      FLOOR_PLAN_CONFIG.rooms.forEach(config => {
        const label = threeState.labelElements[config.id];
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

        // Project 3D to 2D - use labelY offset to prevent overlap
        // config.x, config.z are center coordinates; convert to world space
        const position = new THREE.Vector3(
          config.x - centerX,
          config.labelY || 3,
          config.z - centerZ
        );
        position.project(threeState.camera);

        const x = (position.x * 0.5 + 0.5) * containerWidth;
        const y = (-position.y * 0.5 + 0.5) * containerHeight;

        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        // Only show label if within container bounds and container is visible
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
        const meshGroup = threeState.roomMeshes[roomData.id];
        if (!meshGroup) return;

        // Find floor mesh directly in children
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

    animate() {
      const self = this;
      function loop() {
        threeState.animationId = requestAnimationFrame(loop);

        // Update OrbitControls (required for damping)
        if (threeState.controls) {
          threeState.controls.update();
        }

        self.updateRoomColors();
        self.updateLabels();

        if (threeState.renderer && threeState.scene && threeState.camera) {
          threeState.renderer.render(threeState.scene, threeState.camera);
        }
      }
      loop();
    },

    onResize() {
      const container = this.$refs.threeContainer;
      if (!container || !threeState.camera || !threeState.renderer) return;

      const aspect = container.clientWidth / container.clientHeight;

      // Update PerspectiveCamera aspect ratio
      threeState.camera.aspect = aspect;
      threeState.camera.updateProjectionMatrix();

      threeState.renderer.setSize(container.clientWidth, container.clientHeight);
    },

    setViewMode(mode) {
      this.viewMode = mode;
    },

    // View control functions
    set3DView() {
      this.viewMode3D = '3d';
      if (threeState.camera && threeState.controls) {
        threeState.camera.position.set(12, 12, 12);
        threeState.controls.target.set(0, 0, 0);
        threeState.controls.update();
      }
    },

    setTopView() {
      this.viewMode3D = 'top';
      if (threeState.camera && threeState.controls) {
        threeState.camera.position.set(0, 14, -0.1);
        threeState.controls.target.set(0, 0, 0);
        threeState.controls.update();
      }
    },

    toggleWalls() {
      this.wallsVisible = !this.wallsVisible;
      setWallsVisibility(threeState.wallMeshes, this.wallsVisible);
    },

    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate;
      if (threeState.controls) {
        threeState.controls.autoRotate = this.autoRotate;
        threeState.controls.autoRotateSpeed = 2.0;
      }
    },

    toggleDarkTheme() {
      this.darkTheme = !this.darkTheme;
      applyDarkTheme(threeState.scene, this.darkTheme);
    },

    zoomIn() {
      if (threeState.camera && threeState.controls) {
        const direction = new THREE.Vector3();
        direction.subVectors(threeState.controls.target, threeState.camera.position).normalize();
        threeState.camera.position.addScaledVector(direction, 2);
        threeState.controls.update();
      }
    },

    zoomOut() {
      if (threeState.camera && threeState.controls) {
        const direction = new THREE.Vector3();
        direction.subVectors(threeState.controls.target, threeState.camera.position).normalize();
        threeState.camera.position.addScaledVector(direction, -2);
        threeState.controls.update();
      }
    },

    getLegendItems() {
      if (this.viewMode === 'temperature') {
        return [
          { label: '< 20°', color: '#90CAF9' },
          { label: '20-24°', color: '#81C784' },
          { label: '24-28°', color: '#FFE082' },
          { label: '> 28°', color: '#EF5350' }
        ];
      } else {
        return [
          { label: '< 40%', color: '#FFCC80' },
          { label: '40-60%', color: '#81C784' },
          { label: '60-70%', color: '#90CAF9' },
          { label: '> 70%', color: '#5C6BC0' }
        ];
      }
    }
  };
}
