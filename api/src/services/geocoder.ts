/**
 * geocoder.ts — fast, deterministic article geolocation.
 *
 * Location entities are extracted with compromise (NLP) and resolved against
 * a bundled table of ~90 world cities/countries — no live geocoding network
 * calls, so startup ingestion is fast and never rate-limited. Falls back to
 * the outlet's headquarters when no known place is found in the text.
 */

import nlp from 'compromise';

// Bundled city coordinates (city name lowercased → lat, lng).
const CITY_COORDS: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  'new york': [40.7128, -74.006],
  'new york city': [40.7128, -74.006],
  washington: [38.9072, -77.0369],
  'washington dc': [38.9072, -77.0369],
  paris: [48.8566, 2.3522],
  berlin: [52.52, 13.405],
  tokyo: [35.6762, 139.6503],
  beijing: [39.9042, 116.4074],
  moscow: [55.7558, 37.6173],
  brussels: [50.8503, 4.3517],
  geneva: [46.2044, 6.1432],
  vienna: [48.2082, 16.3738],
  madrid: [40.4168, -3.7038],
  rome: [41.9028, 12.4964],
  amsterdam: [52.3676, 4.9041],
  stockholm: [59.3293, 18.0686],
  oslo: [59.9139, 10.7522],
  copenhagen: [55.6761, 12.5683],
  helsinki: [60.1699, 24.9384],
  warsaw: [52.2297, 21.0122],
  kyiv: [50.4501, 30.5234],
  'kyiv kyiv': [50.4501, 30.5234],
  mumbai: [19.076, 72.8777],
  'new delhi': [28.6139, 77.209],
  delhi: [28.6139, 77.209],
  bangalore: [12.9716, 77.5946],
  singapore: [1.3521, 103.8198],
  'hong kong': [22.3193, 114.1694],
  shanghai: [31.2304, 121.4737],
  shenzhen: [22.5431, 114.0579],
  taipei: [25.033, 121.5654],
  seoul: [37.5665, 126.978],
  pyongyang: [39.0392, 125.7625],
  bangkok: [13.7563, 100.5018],
  jakarta: [-6.2088, 106.8456],
  manila: [14.5995, 120.9842],
  kuala: [3.139, 101.6869],
  islamabad: [33.6844, 73.0479],
  kabul: [34.5553, 69.2075],
  tehran: [35.6892, 51.389],
  baghdad: [33.3152, 44.3661],
  damascus: [33.5138, 36.2765],
  beirut: [33.8938, 35.5018],
  tel: [32.0853, 34.7818],
  jerusalem: [31.7683, 35.2137],
  'saudi': [24.7136, 46.6753],
  riyadh: [24.7136, 46.6753],
  dubai: [25.2048, 55.2708],
  doha: [25.2854, 51.531],
  cairo: [30.0444, 31.2357],
  algiers: [36.7538, 3.0588],
  rabat: [34.0209, -6.8416],
  tunis: [36.8065, 10.1815],
  tripoli: [32.8872, 13.1913],
  istanbul: [41.0082, 28.9784],
  ankarak: [39.9334, 32.8597],
  lagos: [6.5244, 3.3792],
  abuja: [9.0765, 7.3986],
  nairobi: [-1.2921, 36.8219],
  addis: [9.03, 38.74],
  accra: [5.6037, -0.187],
  dakar: [14.7167, -17.4677],
  johannesburg: [-26.2041, 28.0473],
  cape: [-33.9249, 18.4241],
  'sao': [-23.5505, -46.6333],
  'rio': [-22.9068, -43.1729],
  buenos: [-34.6037, -58.3816],
  santiago: [-33.4489, -70.6693],
  lima: [-12.0464, -77.0428],
  bogota: [4.711, -74.0721],
  caracas: [10.4806, -66.9036],
  'mexico city': [19.4326, -99.1332],
  cancun: [21.1619, -86.8515],
  toronto: [43.6532, -79.3832],
  montreal: [45.5017, -73.5673],
  'los angeles': [34.0522, -118.2437],
  'san francisco': [37.7749, -122.4194],
  'san jose': [37.3382, -121.8863],
  chicago: [41.8781, -87.6298],
  boston: [42.3601, -71.0589],
  miami: [25.7617, -80.1918],
  houston: [29.7604, -95.3698],
  seattle: [47.6062, -122.3321],
  'austin': [30.2672, -97.7431],
  denver: [39.7392, -104.9903],
  atlanta: [33.749, -84.388],
  honolulu: [21.3069, -157.8583],
  sydney: [-33.8688, 151.2093],
  melbourne: [-37.8136, 144.9631],
  brisbane: [-27.4698, 153.0251],
  perth: [-31.9505, 115.8605],
  auckland: [-36.8509, 174.7645],
  wellington: [-41.2866, 174.7756],
  honiara: [-9.4456, 159.9729],
  port: [-18.1248, 178.4501],
};

// Bundled country coordinates.
const COUNTRY_COORDS: Record<string, [number, number]> = {
  uk: [54.0, -2.0],
  'united kingdom': [54.0, -2.0],
  britain: [54.0, -2.0],
  usa: [39.8, -98.6],
  us: [39.8, -98.6],
  'united states': [39.8, -98.6],
  america: [39.8, -98.6],
  china: [35.9, 104.2],
  japan: [36.2, 138.3],
  india: [20.6, 79.0],
  russia: [61.5, 105.3],
  germany: [51.2, 10.4],
  france: [46.2, 2.2],
  italy: [41.9, 12.6],
  spain: [40.5, -3.7],
  ukraine: [49.0, 31.5],
  poland: [52.0, 19.1],
  turkey: [39.0, 35.2],
  israel: [31.0, 34.9],
  iran: [32.4, 53.7],
  iraq: [33.0, 43.7],
  afghanistan: [33.9, 67.7],
  pakistan: [30.4, 69.3],
  'north korea': [40.3, 127.5],
  'south korea': [36.0, 128.0],
  australia: [-25.3, 133.8],
  'new zealand': [-40.9, 174.9],
  brazil: [-14.2, -51.9],
  argentina: [-38.4, -63.6],
  chile: [-35.7, -71.5],
  peru: [-9.2, -75.0],
  colombia: [4.6, -74.3],
  venezuela: [6.4, -66.6],
  mexico: [23.6, -102.5],
  canada: [56.1, -106.3],
  egypt: [26.8, 30.8],
  'south africa': [-30.6, 22.9],
  nigeria: [9.1, 8.7],
  kenya: [-1.3, 36.8],
  ethiopia: [9.1, 40.5],
  ghana: [7.9, -1.0],
  senegal: [14.5, -14.5],
  morocco: [31.8, -7.1],
  algeria: [28.0, 1.7],
  tunisia: [33.9, 9.5],
  libya: [26.3, 17.2],
  saudi: [23.9, 45.1],
  'saudi arabia': [23.9, 45.1],
  uae: [23.4, 53.8],
  qatar: [25.3, 51.2],
  indonesia: [-0.8, 113.9],
  malaysia: [4.2, 101.9],
  singapore: [1.35, 103.8],
  thailand: [15.9, 100.9],
  philippines: [12.9, 121.8],
  vietnam: [14.1, 108.3],
  bangladesh: [23.7, 90.4],
  sri: [7.9, 80.8],
  nepal: [28.4, 84.1],
};

// Outlet headquarters (fallback when no known place is in the text).
const SOURCE_LOCATIONS: Record<string, [number, number]> = {
  'BBC News': [51.5074, -0.1278],
  'NPR News': [38.9072, -77.0369],
  'The Guardian': [51.5074, -0.1278],
  'Al Jazeera': [25.2854, 51.531],
  'Deutsche Welle': [50.7359, 7.1007],
  'France 24': [48.8939, 2.3025],
  'NBC News': [40.7589, -73.9851],
  'AP News': [40.7589, -73.9851],
  'Reuters': [51.5074, -0.1278],
  'NHK World': [35.6762, 139.6503],
  'South China Morning Post': [22.3193, 114.1694],
  'ProPublica': [40.7128, -74.006],
  'The Conversation': [-37.8136, 144.9631],
  'Ars Technica': [37.7749, -122.4194],
  'TechCrunch': [37.7749, -122.4194],
  'Al-Monitor': [38.9072, -77.0369],
  'The Hindu': [13.0827, 80.2707],
  'Times of India': [19.076, 72.8777],
  'Daily Maverick': [-33.9249, 18.4241],
  'The East African': [-1.2921, 36.8219],
  'MercoPress': [-34.6037, -58.3816],
  'Buenos Aires Times': [-34.6037, -58.3816],
  'EUobserver': [50.8503, 4.3517],
  'Euronews': [45.764, 4.8357],
  'Nature News': [51.5074, -0.1278],
  'Science Magazine': [38.9072, -77.0369],
  'The Lancet': [51.5074, -0.1278],
};

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

function lookupPlace(name: string): [number, number] | null {
  const key = normalize(name);
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  if (COUNTRY_COORDS[key]) return COUNTRY_COORDS[key];
  // Multi-word matches are often "City, Country" — try the first token.
  const first = key.split(/[,\s]+/)[0];
  if (first && CITY_COORDS[first]) return CITY_COORDS[first];
  if (first && COUNTRY_COORDS[first]) return COUNTRY_COORDS[first];
  return null;
}

/**
 * Resolve coordinates for an article. Deterministic (no randomness), fast
 * (no network), and falls back to the outlet's HQ.
 */
export async function getArticleCoordinates(article: any): Promise<{ lat: number; lng: number }> {
  const text = [article.title, article.summary, article.content]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (text.length > 10) {
    try {
      const places = nlp(text).places().out('array') as string[];
      for (const place of places) {
        if (typeof place !== 'string' || place.length < 3) continue;
        const coords = lookupPlace(place);
        if (coords) return { lat: coords[0], lng: coords[1] };
      }
      // Second pass: normalize aliases like "New York" -> "new york".
      for (const place of places) {
        if (typeof place !== 'string' || place.length < 3) continue;
        const coords = lookupPlace(place.toLowerCase());
        if (coords) return { lat: coords[0], lng: coords[1] };
      }
    } catch (e) {
      // Fall through to source-based coordinates.
    }
  }

  const fallback = SOURCE_LOCATIONS[article.source] || SOURCE_LOCATIONS[article.sourceName] || [40.0, 0.0];
  return { lat: fallback[0], lng: fallback[1] };
}
