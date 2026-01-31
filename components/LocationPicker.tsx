import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input, LoadingSpinner } from './ui';

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  label: string;
  onLocationSelect: (lat: string, long: string, displayName: string) => void;
  initialValue?: string;
  placeholder?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
  label, 
  onLocationSelect, 
  initialValue = '', 
  placeholder = "Cari desa atau kecamatan..." 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedName, setSelectedName] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // We restrict search to Majalengka area for better context
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Majalengka Indonesia')}&limit=5`
        );
        const data = await response.json();
        setResults(data);
        setShowDropdown(true);
      } catch (error) {
        console.error("Geocoding error", error);
      } finally {
        setLoading(false);
      }
    }, 800); // 800ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (item: LocationResult) => {
    // Extract a shorter name (usually the first part before the comma)
    const shortName = item.display_name.split(',')[0];
    const fullName = item.display_name; // Or keep full address
    
    setSelectedName(fullName);
    setQuery('');
    setShowDropdown(false);
    onLocationSelect(item.lat, item.lon, fullName);
  };

  return (
    <div className="mb-3 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      
      {selectedName && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
          <MapPin size={18} className="text-brand-green mt-0.5 shrink-0" />
          <div className="text-sm text-green-800 break-words">{selectedName}</div>
          <button 
            type="button" 
            onClick={() => setSelectedName('')}
            className="text-xs text-gray-500 hover:text-red-500 underline ml-auto shrink-0"
          >
            Ubah
          </button>
        </div>
      )}

      {!selectedName && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition-all"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-green"></div>
              </div>
            )}
          </div>

          {showDropdown && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-sm transition-colors flex items-start gap-2"
                  onClick={() => handleSelect(item)}
                >
                  <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};