import { useEffect, useRef } from 'react';
import { useSubscription } from '@apollo/client';
import { Box } from '@mui/material';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import 'ol/ol.css';

import { NEW_GEO_DATA_SUBSCRIPTION, GeoData } from '../graphql/subscriptions';

// Colors for each vehicle
const VEHICLE_COLORS: Record<string, string> = {
  'VEHICLE-001': '#e53935', // Red
  'VEHICLE-002': '#1e88e5', // Blue
  'VEHICLE-003': '#43a047', // Green
  'VEHICLE-004': '#fb8c00', // Orange
  'VEHICLE-005': '#8e24aa', // Purple
};

interface MapViewProps {
  filteredIdentifiers: Set<string>;
  onNewGeoData: (data: GeoData) => void;
  focusPoint: GeoData | null;
}

export function MapView({ filteredIdentifiers, onNewGeoData, focusPoint }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const pointsSourceRef = useRef<VectorSource | null>(null);
  const linesSourceRef = useRef<VectorSource | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const geoDataByIdentifier = useRef<Map<string, GeoData[]>>(new Map());

  // Subscribe to new geo data
  const { data, error, loading } = useSubscription<{ newGeoData: GeoData }>(NEW_GEO_DATA_SUBSCRIPTION);

  // Log subscription status
  useEffect(() => {
    console.log('🔄 Subscription status - loading:', loading, 'error:', error, 'data:', data);
  }, [loading, error, data]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const pointsSource = new VectorSource();
    const linesSource = new VectorSource();
    pointsSourceRef.current = pointsSource;
    linesSourceRef.current = linesSource;

    // Lines layer (below points) - solid colored route lines
    const linesLayer = new VectorLayer({
      source: linesSource,
      style: (feature) => {
        const identifier = feature.get('identifier') as string;
        const color = VEHICLE_COLORS[identifier] || '#666666';
        return new Style({
          stroke: new Stroke({
            color: color,
            width: 4,
          }),
        });
      },
    });

    // Points layer (above lines) - all historical points visible
    const pointsLayer = new VectorLayer({
      source: pointsSource,
      style: (feature) => {
        const identifier = feature.get('identifier') as string;
        const name = feature.get('name') as string;
        const isLatest = feature.get('isLatest') as boolean;
        const pointIndex = feature.get('pointIndex') as number;
        const color = VEHICLE_COLORS[identifier] || '#666666';
        
        return new Style({
          image: new CircleStyle({
            radius: isLatest ? 14 : 8,
            fill: new Fill({ color: isLatest ? color : color + 'CC' }),
            stroke: new Stroke({ 
              color: '#ffffff', 
              width: isLatest ? 3 : 2 
            }),
          }),
          text: new Text({
            text: isLatest ? name : String(pointIndex),
            offsetY: isLatest ? -24 : 0,
            font: isLatest ? 'bold 12px Arial, sans-serif' : '10px Arial, sans-serif',
            fill: new Fill({ color: isLatest ? '#1a1a1a' : '#ffffff' }),
            stroke: new Stroke({ color: isLatest ? '#ffffff' : color, width: isLatest ? 3 : 0 }),
          }),
        });
      },
    });

    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        linesLayer,
        pointsLayer,
      ],
      view: new View({
        center: fromLonLat([10, 48]),
        zoom: 4,
      }),
    });

    // Tooltip overlay
    if (tooltipRef.current) {
      const overlay = new Overlay({
        element: tooltipRef.current,
        positioning: 'bottom-center',
        offset: [0, -20],
        stopEvent: false,
      });
      map.addOverlay(overlay);

      map.on('pointermove', (evt) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
        if (feature && feature.getGeometry()?.getType() === 'Point' && tooltipRef.current) {
          const coords = (feature.getGeometry() as Point).getCoordinates();
          overlay.setPosition(coords);
          tooltipRef.current.innerHTML = `
            <strong>${feature.get('name')}</strong><br/>
            ID: ${feature.get('identifier')}<br/>
            Lat: ${feature.get('lat').toFixed(4)}<br/>
            Lon: ${feature.get('lon').toFixed(4)}<br/>
            Time: ${new Date(feature.get('timestamp')).toLocaleTimeString()}
          `;
          tooltipRef.current.style.display = 'block';
          map.getTargetElement().style.cursor = 'pointer';
        } else if (tooltipRef.current) {
          overlay.setPosition(undefined);
          tooltipRef.current.style.display = 'none';
          map.getTargetElement().style.cursor = '';
        }
      });
    }

    mapInstanceRef.current = map;

    setTimeout(() => map.updateSize(), 100);

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle new geo data from subscription
  useEffect(() => {
    if (!data?.newGeoData || !pointsSourceRef.current || !linesSourceRef.current) return;

    const geoData = data.newGeoData;
    console.log('📍 Received:', geoData.identifier, geoData.name);

    // Notify parent component
    onNewGeoData(geoData);

    // Store data by identifier
    const identifierData = geoDataByIdentifier.current.get(geoData.identifier) || [];
    identifierData.push(geoData);
    geoDataByIdentifier.current.set(geoData.identifier, identifierData);

    // Update previous point to not be latest
    pointsSourceRef.current.getFeatures().forEach((f) => {
      if (f.get('identifier') === geoData.identifier && f.get('isLatest')) {
        f.set('isLatest', false);
      }
    });

    // Create new point feature with index number
    const pointIndex = identifierData.length;
    const pointFeature = new Feature({
      geometry: new Point(fromLonLat([geoData.lon, geoData.lat])),
      name: geoData.name,
      identifier: geoData.identifier,
      lat: geoData.lat,
      lon: geoData.lon,
      timestamp: geoData.timestamp,
      isLatest: true,
      pointIndex: pointIndex,
    });
    pointFeature.setId(geoData.id);
    pointsSourceRef.current.addFeature(pointFeature);

    // Update route line for this identifier
    const lineFeatureId = `line-${geoData.identifier}`;
    const existingLine = linesSourceRef.current.getFeatureById(lineFeatureId);
    
    if (identifierData.length >= 2) {
      const coords = identifierData.map((d) => fromLonLat([d.lon, d.lat]));
      
      if (existingLine) {
        (existingLine.getGeometry() as LineString).setCoordinates(coords);
      } else {
        const lineFeature = new Feature({
          geometry: new LineString(coords),
          identifier: geoData.identifier,
        });
        lineFeature.setId(lineFeatureId);
        linesSourceRef.current.addFeature(lineFeature);
      }
    }

    console.log('📍 Total points:', pointsSourceRef.current.getFeatures().length);
  }, [data, onNewGeoData]);

  // Handle filter changes - show/hide features
  useEffect(() => {
    if (!pointsSourceRef.current || !linesSourceRef.current) return;

    pointsSourceRef.current.getFeatures().forEach((feature) => {
      const identifier = feature.get('identifier');
      const visible = filteredIdentifiers.size === 0 || filteredIdentifiers.has(identifier);
      feature.setStyle(visible ? undefined : new Style({}));
    });

    linesSourceRef.current.getFeatures().forEach((feature) => {
      const identifier = feature.get('identifier');
      const visible = filteredIdentifiers.size === 0 || filteredIdentifiers.has(identifier);
      feature.setStyle(visible ? undefined : new Style({}));
    });
  }, [filteredIdentifiers]);

  // Handle focus on point
  useEffect(() => {
    if (!focusPoint || !mapInstanceRef.current) return;

    const view = mapInstanceRef.current.getView();
    view.animate({
      center: fromLonLat([focusPoint.lon, focusPoint.lat]),
      zoom: 10,
      duration: 500,
    });
  }, [focusPoint]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} 
      />
      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          backgroundColor: 'white',
          padding: '10px 14px',
          borderRadius: '6px',
          boxShadow: '0 3px 14px rgba(0,0,0,0.25)',
          fontSize: '13px',
          lineHeight: '1.5',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          border: '1px solid #e0e0e0',
        }}
      />
    </Box>
  );
}

export { VEHICLE_COLORS };
