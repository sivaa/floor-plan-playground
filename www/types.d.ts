// Type declarations for CDN-loaded globals

declare const THREE: typeof import('three');
declare const Alpine: any;
declare const mqtt: any;

interface Window {
  Alpine: any;
  networkView: () => any;
  FLOOR_PLAN_CONFIG: any;
  TEMP_COLORS: any;
  HUMIDITY_COLORS: any;
  SENSOR_VISUALS: any;
  CONFIG: any;
  app: any;
  comfortScoreView: any;
  barCompareView: any;
  floorPlanView: any;
  ambientView: any;
  timelineView: any;
  classicView: any;
  lightsView: any;
  threeDView: any;
  sensorConfigView: any;
  co2View: any;
  roomDetailView: any;
  isometricView: any;
  heaterView: any;
  networkView: any;
  mailboxView: any;
  thermostatView: any;
  _configThreeState: any;
}

interface Element {
  _x_dataStack?: any[];
}

// Allow event.target properties on EventTarget
interface EventTarget {
  tagName?: string;
  closest?: (selector: string) => Element | null;
}

// Allow detail on Event
interface Event {
  detail?: any;
}
