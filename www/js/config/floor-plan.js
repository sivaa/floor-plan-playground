/**
 * Floor Plan Configuration
 * Exact dimensions from floor map (mirrored layout)
 */

export const FLOOR_PLAN_CONFIG = {
  apartmentWidth: 9.239,
  apartmentDepth: 6.665,  // Reduced from 7.665 (south wall moved 1.0m north)
  wallHeight: 2.0,
  wallThickness: 0.15,
  // Room positions are center coordinates (mirrored layout)
  rooms: [
    { id: 'study', name: 'Study', icon: '📚', x: 7.285, z: 1.8485, width: 3.908, depth: 3.697, color: 0x60a5fa, labelY: 3 },
    { id: 'living', name: 'Living Room', icon: '🛋️', x: 6.864, z: 5.181, width: 4.750, depth: 2.968, color: 0x34d399, labelY: 3 },
    { id: 'bedroom', name: 'Bedroom', icon: '🛏️', x: 2.2445, z: 5.476, width: 4.489, depth: 2.378, color: 0xfbbf24, labelY: 4 },
    { id: 'kitchen', name: 'Kitchen', icon: '🍳', x: 1.6655, z: 2.8957, width: 3.331, depth: 2.7827, color: 0xf87171, labelY: 3 },
    { id: 'bathroom', name: 'Bathroom', icon: '🚿', x: 1.6985, z: 0.7522, width: 3.397, depth: 1.5043, color: 0xa78bfa, labelY: 2 }
  ],
  balcony: { x: 9.764, z: 7.065, width: 1.050, depth: 1.200, color: 0x93c5fd },
  hallway: { x: 3.839, z: 2.0, width: 1.5, depth: 2.5, color: 0x94a3b8 },
  balconyNotch: {
    width: 1.0,
    depth: 1.5,
    hasRailing: true,
    floorColor: 0xC9B89A  // Warm beige (same as room floors)
  },
  doors: [
    // All door markers removed - door openings still exist in walls
  ],
  windows: [
    // All window markers removed - window openings still exist in walls
  ],
  furniture: [
    { type: 'bed', room: 'bedroom', width: 1.8, depth: 2.0, height: 0.6 }
  ]
};
