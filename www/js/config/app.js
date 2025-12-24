/**
 * Application Configuration
 * MQTT, InfluxDB, rooms, and thermostats
 */

export const CONFIG = {
  // Detect if running locally (localhost) vs on Pi
  // Local dev: connect directly to Pi services
  // Pi deployment: use nginx proxy
  mqttUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://pi:9001'  // Local dev → connect to Pi's MQTT WebSocket
    : window.location.port === '8888'
      ? 'ws://' + window.location.host + '/mqtt'  // Pi nginx proxy
      : 'ws://' + window.location.hostname + ':9001',
  baseTopic: 'zigbee2mqtt',
  // InfluxDB connection
  influxUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://pi:8086'  // Local dev → connect to Pi's InfluxDB
    : window.location.port === '8888'
      ? window.location.origin + '/api/influx'  // Pi nginx proxy
      : 'http://' + window.location.hostname + ':8086',
  influxDb: 'homeassistant',
  // Room configuration - isOutdoor: true excludes from home-wide averages
  rooms: [
    { id: 'living', name: 'Living Room', icon: '🛋️', sensor: '[Living] Temperature & Humidity', entityId: 'sensor.living_temperature_humidity', isOutdoor: false },
    { id: 'bedroom', name: 'Bedroom', icon: '🛏️', sensor: '[Bed] Temperature & Humidity Sensor', entityId: 'sensor.bed_temperature_humidity_sensor', isOutdoor: false },
    { id: 'study', name: 'Study', icon: '📚', sensor: '[Study] Temperature & Humidity', entityId: 'sensor.study_temperature_humidity', isOutdoor: false },
    { id: 'kitchen', name: 'Kitchen', icon: '🍳', sensor: '[Kitchen] Temperature & Humidity', entityId: 'sensor.kitchen_temperature_humidity', isOutdoor: false },
    { id: 'bathroom', name: 'Bathroom', icon: '🚿', sensor: '[Bath] Temperature & Humidity', entityId: 'sensor.bath_temperature_humidity', isOutdoor: false },
    { id: 'balcony', name: 'Balcony', icon: '🌿', sensor: '[Balcony] Temperature & Humidity', entityId: 'sensor.balcony_temperature_humidity', isOutdoor: true }
  ],
  staleThreshold: 5 * 60 * 1000,  // 5 minutes
  maxHistoryPoints: 500,
  historyHours: 6,

  // Thermostat configuration (SONOFF TRVZB devices)
  thermostats: [
    {
      id: 'study',
      name: 'Study',
      icon: '📚',
      sensor: '[Study] Thermostat',
      entityId: 'climate.study_thermostat',
      roomId: 'study',
      roomSensor: '[Study] Temperature & Humidity'  // Linked room temp sensor
    },
    {
      id: 'living_inner',
      name: 'Living Inner',
      icon: '🛋️',
      sensor: '[Living] Thermostat Inner',
      entityId: 'climate.living_thermostat_inner',
      roomId: 'living',
      roomSensor: '[Living] Temperature & Humidity'
    },
    {
      id: 'living_outer',
      name: 'Living Outer',
      icon: '🛋️',
      sensor: '[Living] Thermostat Outer',
      entityId: 'climate.living_thermostat_outer',
      roomId: 'living',
      roomSensor: '[Living] Temperature & Humidity'
    },
    {
      id: 'bedroom',
      name: 'Bedroom',
      icon: '🛏️',
      sensor: '[Bed] Thermostat',
      entityId: 'climate.bed_thermostat',
      roomId: 'bedroom',
      roomSensor: '[Bed] Temperature & Humidity Sensor'
    }
  ]
};
