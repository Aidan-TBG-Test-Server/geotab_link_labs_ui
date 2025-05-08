import React, { useState } from 'react';
import { format } from 'date-fns';
import { LocationHistoryEntry } from '../lib/api';
import { 
  formatLocalDateTime, 
  formatRelativeTime, 
  getLocalDay, 
  formatDay,
  convertUTCToLocal
} from '../lib/dateUtils';
import { MapPin, Navigation, Clock, ChevronDown, ChevronUp, Wifi, Radio, Smartphone, RefreshCw, Sparkles } from 'lucide-react';

interface LocationHistoryTimelineProps {
  historyData: LocationHistoryEntry[];
  onSelectLocation?: (entry: LocationHistoryEntry) => void;
}

const LocationHistoryTimeline: React.FC<LocationHistoryTimelineProps> = ({ 
  historyData,
  onSelectLocation 
}) => {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  
  if (historyData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg p-6 text-gray-500">
        <RefreshCw className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium">No history data available</h3>
        <p className="text-sm">There is no location history for the selected time range.</p>
      </div>
    );
  }
  
  // Group entries by day in the user's local timezone
  const groupedByDay: Record<string, LocationHistoryEntry[]> = {};
  
  // Sort entries by time descending (most recent first)
  const sortedEntries = [...historyData].sort((a, b) => 
    new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  
  sortedEntries.forEach(entry => {
    // Group by day in LOCAL timezone, not UTC
    const dayKey = getLocalDay(entry.time);
    
    if (!groupedByDay[dayKey]) {
      groupedByDay[dayKey] = [];
    }
    
    groupedByDay[dayKey].push(entry);
  });
  
  const toggleDay = (day: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };
  
  const getLocationIcon = (entry: LocationHistoryEntry) => {
    if (!entry.locationType) {
      return <RefreshCw className="w-4 h-4 text-gray-400" title="Heartbeat" />;
    }
    
    const locationType = entry.locationType.toLowerCase();
    
    if (locationType.includes('gps')) {
      return <Navigation className="w-4 h-4 text-blue-500" title="GPS" />;
    }
    
    if (locationType.includes('wifi') && locationType.includes('cellid')) {
      return <Smartphone className="w-4 h-4 text-indigo-500" title="WiFi + Cell ID" />;
    }
    
    if (locationType.includes('wifi')) {
      return <Wifi className="w-4 h-4 text-green-500" title="WiFi" />;
    }
    
    if (locationType.includes('cellid')) {
      return <Radio className="w-4 h-4 text-amber-500" title="Cell ID" />;
    }
    
    if (locationType.includes('loc0') || locationType === 'supertag') {
      return <Sparkles className="w-4 h-4 text-purple-500" title="SuperTag" />;
    }
    
    return <MapPin className="w-4 h-4 text-gray-500" title={entry.locationType} />;
  };
  
  // Sort days by most recent first
  const sortedDays = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Location Timeline</h3>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
        {sortedDays.map(day => {
          const entries = groupedByDay[day];
          const formattedDate = formatDay(day + "T00:00:00");
          const isExpanded = expandedDays[day] !== false; // Default to expanded

          return (
            <div key={day} className="bg-white">
              <button
                onClick={() => toggleDay(day)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#87B812] rounded-full flex items-center justify-center text-white">
                    {entries.length}
                  </div>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="space-y-1 px-4 pb-4">
                  {entries.map((entry, index) => (
                    <button
                      key={`${entry.time}-${index}`}
                      className={`w-full p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        entry.latitude && entry.longitude ? 'cursor-pointer' : 'cursor-default opacity-70'
                      } ${index === 0 ? 'border-l-4 border-l-blue-500 pl-2' : ''}`}
                      onClick={() => {
                        if (entry.latitude && entry.longitude && onSelectLocation) {
                          onSelectLocation(entry);
                        }
                      }}
                      disabled={!entry.latitude || !entry.longitude}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getLocationIcon(entry)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {entry.locationType || 'Heartbeat'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatLocalDateTime(entry.time)}
                            <span className="text-xs text-gray-500 ml-2">
                              ({formatRelativeTime(entry.time)})
                            </span>
                          </div>
                          {entry.latitude && entry.longitude && (
                            <div className="text-sm text-gray-600 mt-1">
                              Coordinates: {Number(entry.latitude).toFixed(6)}°, {Number(entry.longitude).toFixed(6)}°
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LocationHistoryTimeline;