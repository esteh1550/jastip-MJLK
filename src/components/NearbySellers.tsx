import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MapPin, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function NearbySellers() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('jajanan khas majalengka');
  const [places, setPlaces] = useState<any[]>([]);

  const fetchNearby = async () => {
    setLoading(true);
    setRecommendations('');
    setPlaces([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // We simulate getting user's location in Majalengka
      // Majalengka coordinates: -6.8361, 108.2260
      const lat = -6.8361;
      const lng = 108.2260;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tolong carikan penjual atau tempat makan terdekat untuk "${searchQuery}" di sekitar lokasi saya. Berikan rekomendasi singkat.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        }
      });

      setRecommendations(response.text || 'Tidak ada rekomendasi ditemukan.');
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedPlaces = chunks
          .filter((chunk: any) => chunk.maps?.uri)
          .map((chunk: any) => ({
            title: chunk.maps.title || 'Lokasi',
            uri: chunk.maps.uri
          }));
        setPlaces(extractedPlaces);
      }
    } catch (error: any) {
      console.error('Error fetching nearby sellers:', error);
      toast.error('Gagal mengambil data lokasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex items-center mb-6">
        <MapPin className="h-6 w-6 text-indigo-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Penjual Terdekat (Majalengka)</h2>
      </div>

      <div className="flex space-x-2 mb-6">
        <input
          type="text"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Cari jajan apa?"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchNearby()}
        />
        <button
          onClick={fetchNearby}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500">Mencari penjual terdekat menggunakan Google Maps...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{recommendations}</ReactMarkdown>
          </div>
          
          {places.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="font-bold text-gray-900 mb-4">Lokasi di Google Maps:</h3>
              <ul className="space-y-3">
                {places.map((place, idx) => (
                  <li key={idx}>
                    <a 
                      href={place.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                    >
                      <MapPin className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" />
                      <span className="font-medium text-indigo-600 truncate">{place.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
