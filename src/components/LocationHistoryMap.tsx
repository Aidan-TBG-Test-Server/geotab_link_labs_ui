import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, LayersControl } from 'react-leaflet';
import { LatLngTuple, LatLngExpression, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, Navigation, MapPin, Wifi, Signal } from 'lucide-react';
import { LocationHistoryEntry } from '../lib/api';
import { formatLocalDateTime } from '../lib/dateUtils';

interface LocationHistoryMapProps {
  historyData: LocationHistoryEntry[];
  selectedLocation?: LocationHistoryEntry | null;
}

// Define custom icons for different location types
const createCustomIcon = (color: string) => {
  return new DivIcon({
    className: '',
    html: `
      <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);">
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

const gpsIcon = createCustomIcon('#3B82F6'); // blue
const wifiIcon = createCustomIcon('#10B981'); // green
const cellIdIcon = createCustomIcon('#F59E0B'); // amber
const wifiCellIdIcon = createCustomIcon('#6366F1'); // indigo
const supertagIcon = createCustomIcon('#9333EA'); // purple
const startIcon = createCustomIcon('#DC2626'); // red
const endIcon = createCustomIcon('#000000'); // black
const unknownIcon = createCustomIcon('#9CA3AF'); // gray

// Component to handle map view updates
function MapUpdater({ historyData, selectedLocation }: { 
  historyData: LocationHistoryEntry[]; 
  selectedLocation?: LocationHistoryEntry | null;
}) {
  const map = useMap();
  
  useEffect(() => {
    // Ensure the map is fully initialized and has a container element
    if (!map || !map.getContainer()) return;
    
    // Filter locations with valid coordinates
    const validPoints = historyData.filter(
      entry => entry.latitude && entry.longitude && 
      !isNaN(Number(entry.latitude)) && !isNaN(Number(entry.longitude))
    );
    
    if (validPoints.length === 0) return;
    
    // Use setTimeout to ensure the map has fully rendered before manipulating view
    const timer = setTimeout(() => {
      try {
        if (selectedLocation && 
            selectedLocation.latitude && 
            selectedLocation.longitude && 
            !isNaN(Number(selectedLocation.latitude)) && 
            !isNaN(Number(selectedLocation.longitude))) {
          // Center on the selected location
          map.setView(
            [Number(selectedLocation.latitude), Number(selectedLocation.longitude)], 
            14
          );
        } else {
          // Create bounds that include all points
          const bounds = validPoints.reduce((bounds, point) => {
            const lat = Number(point.latitude);
            const lng = Number(point.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              bounds.push([lat, lng]);
            }
            return bounds;
          }, [] as LatLngTuple[]);
          
          if (bounds.length > 0) {
            map.fitBounds(bounds);
          }
        }
      } catch (e) {
        console.error("Error updating map view:", e);
      }
    }, 100); // Small delay to ensure DOM rendering is complete
    
    return () => clearTimeout(timer);
  }, [map, historyData, selectedLocation]);
  
  return null;
}

// Get the appropriate icon based on location type
const getIconForLocationType = (locationType?: string, isFirst: boolean = false, isLast: boolean = false): DivIcon => {
  if (isFirst) return startIcon;
  if (isLast) return endIcon;
  
  if (!locationType) return unknownIcon; // gray for heartbeats or unknown
  
  const locationTypeLower = locationType.toLowerCase();
  
  if (locationTypeLower.includes('gps')) return gpsIcon;
  if (locationTypeLower.includes('wifi') && locationTypeLower.includes('cellid')) return wifiCellIdIcon;
  if (locationTypeLower.includes('wifi')) return wifiIcon;
  if (locationTypeLower.includes('cellid')) return cellIdIcon;
  if (locationTypeLower.includes('loc0') || locationTypeLower === 'supertag') return supertagIcon;
  
  return unknownIcon; // Default for other types
};

const LocationHistoryMap: React.FC<LocationHistoryMapProps> = ({ historyData, selectedLocation }) => {
  // Change the map type
  const [mapType, setMapType] = useState<'street' | 'terrain' | 'satellite'>(() => {
    const savedMapType = localStorage.getItem('mapType');
    return (savedMapType as 'street' | 'terrain' | 'satellite') || 'street';
  });
  
  // Sort data by timestamp in descending order (newest first)
  const sortedData = [...historyData].sort((a, b) => 
    new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  
  // Filter for entries with valid coordinates
  const validLocations = sortedData.filter(
    entry => entry.latitude && entry.longitude && 
    !isNaN(Number(entry.latitude)) && !isNaN(Number(entry.longitude))
  );
  
  // Default center if no valid locations
  const defaultCenter: LatLngTuple = [36.1428, -78.8846];
  
  // Create polyline coordinates from points with valid coordinates
  const polylinePositions: LatLngExpression[] = validLocations.map(
    entry => [Number(entry.latitude), Number(entry.longitude)] as LatLngExpression
  );
  
  if (validLocations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg p-6 text-gray-500">
        <MapPin className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium">No location data available</h3>
        <p className="text-sm">There are no valid location points in the selected time range.</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200">
      <MapContainer 
        center={defaultCenter}
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        key={`map-${validLocations.length}-${selectedLocation?.time || 'none'}`} // Force re-render when data changes
      >

        <LayersControl position="topright" className="ll_leaflet-control-layers">
          <LayersControl.BaseLayer checked={mapType === 'street'} name="Street">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer checked={mapType === 'terrain'} name="Terrain">
            <TileLayer
              attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer checked={mapType === 'satellite'} name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <MapUpdater historyData={validLocations} selectedLocation={selectedLocation} />
        
        {/* Show markers for each location */}
        {validLocations.map((entry, index) => {
          const isFirst = index === 0;
          const isLast = index === validLocations.length - 1;
          const position: LatLngTuple = [Number(entry.latitude), Number(entry.longitude)];
          
          return (
            <Marker 
              key={`${entry.time}-${index}`}
              position={position}
              icon={getIconForLocationType(entry.locationType, isFirst, isLast)}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="font-medium">{isFirst ? 'Latest Location' : isLast ? 'First Location' : 'Location Point'}</div>
                  <div className="text-sm space-y-1 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span>{formatLocalDateTime(entry.time)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-gray-500" />
                      <span>
                        {Number(entry.latitude).toFixed(6)}°, {Number(entry.longitude).toFixed(6)}°
                      </span>
                    </div>
                    {entry.locationType && (
                      <div className="flex items-center gap-1">
                        <Signal className="w-3 h-3 text-gray-500" />
                        <span>{entry.locationType}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Show path between points */}
        {polylinePositions.length > 1 && (
          <Polyline 
            positions={polylinePositions} 
            color="#4F46E5" 
            weight={3}
            opacity={0.7}
            dashArray="5, 5"
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationHistoryMap;