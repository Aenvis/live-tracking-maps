import { addGeoData } from './resolvers.js';
import type { GeoData } from './schema.js';

// Europe bounding box (approximate)
const BOUNDS = {
  minLat: 35.0,
  maxLat: 60.0,
  minLon: -10.0,
  maxLon: 30.0,
};

// Pool of 5 identifiers with starting positions
const IDENTIFIER_POOL = [
  { id: 'VEHICLE-001', name: 'Truck Alpha', lat: 52.52, lon: 13.405 },    // Berlin
  { id: 'VEHICLE-002', name: 'Van Beta', lat: 48.8566, lon: 2.3522 },     // Paris
  { id: 'VEHICLE-003', name: 'Car Gamma', lat: 51.5074, lon: -0.1278 },   // London
  { id: 'VEHICLE-004', name: 'Bike Delta', lat: 41.9028, lon: 12.4964 },  // Rome
  { id: 'VEHICLE-005', name: 'Drone Echo', lat: 52.3676, lon: 4.9041 },   // Amsterdam
];

// Track current positions for each identifier
const currentPositions: Map<string, { lat: number; lon: number }> = new Map();

// Initialize positions
IDENTIFIER_POOL.forEach((v) => {
  currentPositions.set(v.id, { lat: v.lat, lon: v.lon });
});

let counter = 0;

function generateRandomGeoData(): GeoData {
  counter++;
  
  // Pick a random identifier from the pool
  const vehicle = IDENTIFIER_POOL[Math.floor(Math.random() * IDENTIFIER_POOL.length)];
  const currentPos = currentPositions.get(vehicle.id)!;
  
  // Move the position slightly (simulating movement)
  // Random walk within ~0.1-0.3 degrees (~10-30km)
  const latDelta = (Math.random() - 0.5) * 0.3;
  const lonDelta = (Math.random() - 0.5) * 0.3;
  
  let newLat = currentPos.lat + latDelta;
  let newLon = currentPos.lon + lonDelta;
  
  // Keep within bounds
  newLat = Math.max(BOUNDS.minLat, Math.min(BOUNDS.maxLat, newLat));
  newLon = Math.max(BOUNDS.minLon, Math.min(BOUNDS.maxLon, newLon));
  
  // Update current position
  currentPositions.set(vehicle.id, { lat: newLat, lon: newLon });
  
  return {
    id: `geo-${Date.now()}-${counter}`,
    name: vehicle.name,
    lat: Math.round(newLat * 1000000) / 1000000,
    lon: Math.round(newLon * 1000000) / 1000000,
    identifier: vehicle.id,
    timestamp: new Date().toISOString(),
  };
}

export function startGeoSimulator(intervalMs: number = 5000): void {
  console.log(`📍 Geo simulator started - generating new data every ${intervalMs / 1000}s`);
  console.log(`📍 Tracking ${IDENTIFIER_POOL.length} vehicles: ${IDENTIFIER_POOL.map(v => v.id).join(', ')}`);
  
  setInterval(() => {
    const geoData = generateRandomGeoData();
    console.log(`📍 New geo data: ${geoData.identifier} - ${geoData.name} (${geoData.lat.toFixed(4)}, ${geoData.lon.toFixed(4)})`);
    addGeoData(geoData);
  }, intervalMs);
}
