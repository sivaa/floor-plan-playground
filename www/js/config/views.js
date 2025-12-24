/**
 * View Categories Configuration
 * Single source of truth for all dashboard views and navigation
 */

export const VIEW_CATEGORIES = [
  {
    id: 'monitor',
    name: 'Monitor',
    icon: '📈',
    views: [
      { id: 'comfort', name: 'Score', icon: '🎯', title: 'Comfort Score', key: '1', primary: true },
      { id: 'compare', name: 'Compare', icon: '📊', title: 'Room Comparison', key: '2', primary: true },
      { id: 'timeline', name: 'Timeline', icon: '📖', title: 'Event Timeline', key: '5' },
      { id: 'co2', name: 'CO2', icon: '💨', title: 'CO2 Monitor', key: '0' }
    ]
  },
  {
    id: 'visualize',
    name: 'Visualize',
    icon: '👁️',
    views: [
      { id: '3d', name: '3D', icon: '🏗️', title: '3D Floor Plan', key: '4' },
      { id: 'isometric', name: 'Isometric', icon: '🔷', title: 'Isometric View', key: 'I' },
      { id: 'network', name: 'Network', icon: '📡', title: 'Zigbee Network', key: 'N' }
    ]
  },
  {
    id: 'control',
    name: 'Control',
    icon: '🎛️',
    views: [
      { id: 'lights', name: 'Lights', icon: '💡', title: 'Light Control', key: '7', primary: true },
      { id: 'heater', name: 'Heater', icon: '🔥', title: 'Heater Control', key: 'H' },
      { id: 'mailbox', name: 'Mailbox', icon: '📬', title: 'Mailbox Monitor', key: 'M' }
    ]
  },
  {
    id: 'display',
    name: 'Display',
    icon: '📺',
    views: [
      { id: 'classic', name: 'Classic', icon: '🃏', title: 'Classic Cards', key: '8' }
    ]
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    views: [
      { id: 'config', name: 'Config', icon: '⚙️', title: 'Sensor Config', key: '9' }
    ]
  }
];

// Flat list of all views for lookups - Classic first per user preference
export const ALL_VIEWS = (() => {
  const all = VIEW_CATEGORIES.flatMap(cat => cat.views);
  const classic = all.find(v => v.id === 'classic');
  return classic ? [classic, ...all.filter(v => v.id !== 'classic')] : all;
})();

// Primary views shown in main nav bar
export const PRIMARY_VIEWS = ALL_VIEWS.filter(v => v.primary);

// Overflow views shown in "More" dropdown (non-primary, grouped by category)
export const OVERFLOW_CATEGORIES = VIEW_CATEGORIES.map(cat => ({
  ...cat,
  views: cat.views.filter(v => !v.primary)
})).filter(cat => cat.views.length > 0);

// Keyboard shortcut map
export const KEYBOARD_SHORTCUTS = Object.fromEntries(
  ALL_VIEWS.map(v => [v.key, v.id])
);
