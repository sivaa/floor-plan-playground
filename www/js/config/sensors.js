/**
 * Sensor Configuration
 * Room sensors mapping, thermostat events, and sensor visual properties
 */

// Room-to-sensors mapping for Classic view (multi-sensor support)
// Each room can have multiple climate sensors + optional CO2/motion/contact sensors
export const ROOM_SENSORS = {
  living: {
    climate: [
      { name: '[Living] Temperature & Humidity', label: 'Primary', isPrimary: true },
      { name: '[Living] Temperature & Humidity 6', label: 'Sensor 2' },
      { name: '[Living] Temperature & Humidity 7', label: 'Sensor 3' }
    ],
    co2: [
      { name: 'CO2', label: 'CO2 Monitor' }
    ]
  },
  bedroom: {
    climate: [
      { name: '[Bed] Temperature & Humidity Sensor', label: 'Primary', isPrimary: true },
      { name: '[Bed] Temperature & Humidity 9', label: 'Sensor 2' }
    ]
  },
  study: {
    climate: [
      { name: '[Study] Temperature & Humidity', label: 'Primary', isPrimary: true },
      { name: '[Study] Temperature & Humidity 8', label: 'Sensor 2' }
    ]
  },
  kitchen: {
    climate: [
      { name: '[Kitchen] Temperature & Humidity', label: 'Primary', isPrimary: true },
      { name: '[Kitchen] Temperature & Humidity 10', label: 'Sensor 2' }
    ]
  },
  bathroom: {
    climate: [
      { name: '[Bath] Temperature & Humidity', label: 'Primary', isPrimary: true },
      { name: '[Bath] Temperature & Humidity 11', label: 'Sensor 2' }
    ]
  },
  balcony: {
    climate: [
      { name: '[Balcony] Temperature & Humidity', label: 'Outdoor', isPrimary: true }
    ]
  }
};

// Thermostat event types for timeline view
export const THERMOSTAT_EVENT_TYPES = {
  // IMPORTANT - Full card display (heating state changes)
  heating_started: {
    icon: '🔥',
    color: '#ef4444',
    label: 'Heating Started',
    priority: 'important',
    category: 'heating'
  },
  heating_stopped: {
    icon: '❄️',
    color: '#3b82f6',
    label: 'Heating Stopped',
    priority: 'important',
    category: 'heating'
  },
  target_reached: {
    icon: '✅',
    color: '#22c55e',
    label: 'Target Reached',
    priority: 'important',
    category: 'heating'
  },
  device_offline: {
    icon: '📡',
    color: '#ef4444',
    label: 'Device Offline',
    priority: 'important',
    category: 'system'
  },
  low_battery: {
    icon: '🔋',
    color: '#f59e0b',
    label: 'Low Battery',
    priority: 'important',
    category: 'system'
  },

  // ACTIVITY - Compact line display (user actions)
  setpoint_changed: {
    icon: '🎯',
    color: '#f59e0b',
    label: 'Setpoint Changed',
    priority: 'activity',
    category: 'control'
  },
  mode_changed: {
    icon: '⚙️',
    color: '#8b5cf6',
    label: 'Mode Changed',
    priority: 'activity',
    category: 'control'
  },
  preset_changed: {
    icon: '🚀',
    color: '#06b6d4',
    label: 'Preset Changed',
    priority: 'activity',
    category: 'control'
  },
  child_lock_changed: {
    icon: '🔒',
    color: '#64748b',
    label: 'Child Lock Changed',
    priority: 'activity',
    category: 'control'
  },
  window_detected: {
    icon: '🪟',
    color: '#06b6d4',
    label: 'Window Detected',
    priority: 'activity',
    category: 'system'
  },
  initial_state: {
    icon: '📍',
    color: '#6366f1',
    label: 'Initial State',
    priority: 'activity',
    category: 'system'
  },

  // BACKGROUND - Collapsed display (routine events)
  device_online: {
    icon: '📡',
    color: '#22c55e',
    label: 'Device Online',
    priority: 'background',
    category: 'system'
  },
  battery_ok: {
    icon: '🔋',
    color: '#22c55e',
    label: 'Battery OK',
    priority: 'background',
    category: 'system'
  },
  temp_update: {
    icon: '🌡️',
    color: '#94a3b8',
    label: 'Temperature Update',
    priority: 'background',
    category: 'data'
  },
  calibration_changed: {
    icon: '🔧',
    color: '#94a3b8',
    label: 'Calibration Changed',
    priority: 'background',
    category: 'control'
  }
};

// Sensor visual properties for 3D config view
export const SENSOR_VISUALS = {
  climate: {
    shape: 'cube',
    size: { width: 0.12, height: 0.06, depth: 0.12 },
    color: 0x34d399,        // Emerald green
    emissive: 0x34d399,
    emissiveIntensity: 0.2,
    icon: '🌡️',
    label: 'Climate',
    heightAboveFloor: 1.5   // Wall-mounted height (meters)
  },
  co2: {
    shape: 'cylinder',
    size: { radius: 0.06, height: 0.10 },
    color: 0xff6b6b,        // Coral red
    emissive: 0xff6b6b,
    emissiveIntensity: 0.2,
    icon: '💨',
    label: 'CO2',
    heightAboveFloor: 1.2
  },
  motion: {
    shape: 'sphere',
    size: { radius: 0.05 },
    color: 0xffd93d,        // Gold
    emissive: 0xffd93d,
    emissiveIntensity: 0.3,
    icon: '👁️',
    label: 'Motion',
    heightAboveFloor: 2.2,  // Ceiling mount
    // Detection cone properties (SONOFF SNZB-03P specs)
    fov: 110,               // Field of view in degrees
    range: 6                // Detection range in meters
  },
  contact: {
    shape: 'box',
    size: { width: 0.045, height: 0.027, depth: 0.016 },
    color: 0x38bdf8,        // Sky blue
    emissive: 0x38bdf8,
    emissiveIntensity: 0.2,
    icon: '🚪',
    label: 'Contact',
    heightAboveFloor: 1.8,
    // Magnet piece (second part of contact sensor)
    magnetSize: { width: 0.012, height: 0.025, depth: 0.008 },
    magnetOffset: 0.03      // Gap between sensor and magnet when closed
  }
};
