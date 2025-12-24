/**
 * Color Scales Configuration
 * Temperature and humidity visualization colors
 */

// Temperature color scale for visualizations
export const TEMP_COLORS = [
  { value: 18, color: 0x90CAF9 },  // Cold
  { value: 22, color: 0xA5D6A7 },  // Cool
  { value: 24, color: 0x81C784 },  // Comfortable
  { value: 26, color: 0xFFE082 },  // Warm
  { value: 28, color: 0xFFAB91 },  // Hot
  { value: 32, color: 0xEF5350 }   // Very hot
];

// Humidity color scale for visualizations
export const HUMIDITY_COLORS = [
  { value: 30, color: 0xFFCC80 },  // Dry
  { value: 40, color: 0xA5D6A7 },  // Ideal low
  { value: 50, color: 0x81C784 },  // Perfect
  { value: 60, color: 0xA5D6A7 },  // Ideal high
  { value: 70, color: 0x90CAF9 },  // Humid
  { value: 85, color: 0x5C6BC0 }   // Very humid
];
