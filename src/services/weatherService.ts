import type {
  AirQuality,
  ConditionsScore,
  ForecastDay,
  RoutePoint,
  WeatherSnapshot,
} from '../types/domain';

interface WmoInfo {
  desc: string;
  emoji: string;
}

const WMO_CODES: Record<number, WmoInfo> = {
  0: { desc: 'Céu Limpo', emoji: '☀️' },
  1: { desc: 'Predominante Limpo', emoji: '🌤️' },
  2: { desc: 'Parcialmente Nublado', emoji: '⛅' },
  3: { desc: 'Nublado', emoji: '☁️' },
  45: { desc: 'Nevoeiro', emoji: '🌫️' },
  48: { desc: 'Nevoeiro com Geada', emoji: '🌫️' },
  51: { desc: 'Chuvisco Leve', emoji: '🌦️' },
  53: { desc: 'Chuvisco Moderado', emoji: '🌦️' },
  55: { desc: 'Chuvisco Forte', emoji: '🌧️' },
  56: { desc: 'Chuvisco Congelante', emoji: '🌧️' },
  57: { desc: 'Chuvisco Congelante Forte', emoji: '🌧️' },
  61: { desc: 'Chuva Leve', emoji: '🌧️' },
  63: { desc: 'Chuva Moderada', emoji: '🌧️' },
  65: { desc: 'Chuva Forte', emoji: '⛈️' },
  66: { desc: 'Chuva Congelante', emoji: '🌧️' },
  67: { desc: 'Chuva Congelante Forte', emoji: '🌧️' },
  71: { desc: 'Neve Leve', emoji: '🌨️' },
  73: { desc: 'Neve Moderada', emoji: '❄️' },
  75: { desc: 'Neve Forte', emoji: '❄️' },
  77: { desc: 'Grãos de Neve', emoji: '🌨️' },
  80: { desc: 'Pancada de Chuva', emoji: '🌦️' },
  81: { desc: 'Pancada Moderada', emoji: '🌧️' },
  82: { desc: 'Pancada Forte', emoji: '⛈️' },
  85: { desc: 'Pancada de Neve', emoji: '🌨️' },
  86: { desc: 'Pancada de Neve Forte', emoji: '❄️' },
  95: { desc: 'Trovoada', emoji: '⛈️' },
  96: { desc: 'Trovoada com Granizo', emoji: '⛈️' },
  99: { desc: 'Trovoada com Granizo Forte', emoji: '⛈️' },
};

const CACHE_TTL = 10 * 60 * 1000;
const IP_CACHE_TTL = 60 * 60 * 1000;
const FORECAST_CACHE_TTL = 30 * 60 * 1000;
const AQI_CACHE_TTL = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

interface CacheSlot<T> {
  data: T | null;
  timestamp: number;
  key: string;
}

let cache: CacheSlot<WeatherSnapshot> = { data: null, timestamp: 0, key: '' };
let forecastCache: CacheSlot<ForecastDay[]> = { data: null, timestamp: 0, key: '' };
let aqiCache: CacheSlot<AirQuality> = { data: null, timestamp: 0, key: '' };

interface IpLocation {
  lat: number;
  lon: number;
  city: string | null;
}
let ipCache: { data: IpLocation | null; timestamp: number } = { data: null, timestamp: 0 };

export function getWeatherEmoji(code: number): string {
  return WMO_CODES[code]?.emoji ?? '🌡️';
}

export function getWeatherDescription(code: number): string {
  return WMO_CODES[code]?.desc ?? 'Indisponível';
}

export function resetWeatherCache(): void {
  cache = { data: null, timestamp: 0, key: '' };
}

export function resetAllCache(): void {
  cache = { data: null, timestamp: 0, key: '' };
  ipCache = { data: null, timestamp: 0 };
  forecastCache = { data: null, timestamp: 0, key: '' };
  aqiCache = { data: null, timestamp: 0, key: '' };
  geocodeCache.clear();
}

function cacheKey(lat: number, lon: number): string {
  return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
}

function isValidCoord(lat: unknown, lon: unknown): lat is number {
  return (
    lat != null &&
    lon != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lon)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lon)) <= 180
  );
}

/** fetch com timeout — evita requisições penduradas em rede móvel instável. */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface OpenMeteoCurrent {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    uv_index?: number;
  };
}

/** Clima atual via Open-Meteo (gratuito, sem chave de API). */
export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<WeatherSnapshot | null> {
  if (!isValidCoord(lat, lon)) return null;

  const now = Date.now();
  const key = cacheKey(lat, lon);
  if (cache.data && cache.key === key && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index` +
    `&timezone=auto`;

  const data = await fetchJson<OpenMeteoCurrent>(url);
  const current = data?.current;
  if (!current || current.temperature_2m == null) return cache.data;

  const code = current.weather_code ?? 0;
  const info = WMO_CODES[code] ?? { desc: 'Indisponível', emoji: '🌡️' };

  const result: WeatherSnapshot = {
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    description: info.desc,
    emoji: info.emoji,
    windSpeed: Math.round(current.wind_speed_10m ?? 0),
    uvIndex: Math.round(current.uv_index ?? 0),
    weatherCode: code,
  };

  cache = { data: result, timestamp: now, key };
  return result;
}

interface OpenMeteoDaily {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
    weather_code?: number[];
    uv_index_max?: number[];
  };
}

/** Previsão de 3 dias via Open-Meteo. */
export async function fetchWeatherForecast(
  lat: number,
  lon: number
): Promise<ForecastDay[] | null> {
  if (!isValidCoord(lat, lon)) return null;

  const now = Date.now();
  const key = cacheKey(lat, lon);
  if (
    forecastCache.data &&
    forecastCache.key === key &&
    now - forecastCache.timestamp < FORECAST_CACHE_TTL
  ) {
    return forecastCache.data;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,uv_index_max` +
    `&forecast_days=3&timezone=auto`;

  const data = await fetchJson<OpenMeteoDaily>(url);
  const daily = data?.daily;
  if (!daily?.time) return forecastCache.data;

  const result: ForecastDay[] = daily.time.map((date, i) => {
    const code = daily.weather_code?.[i] ?? 0;
    return {
      date,
      tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
      precipitation: daily.precipitation_sum?.[i] ?? 0,
      windSpeed: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
      uvIndex: Math.round(daily.uv_index_max?.[i] ?? 0),
      emoji: getWeatherEmoji(code),
      description: getWeatherDescription(code),
    };
  });

  forecastCache = { data: result, timestamp: now, key };
  return result;
}

interface OpenMeteoAqi {
  current?: {
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
  };
}

/** Qualidade do ar via Open-Meteo Air Quality API (gratuita). */
export async function fetchAirQuality(lat: number, lon: number): Promise<AirQuality | null> {
  if (!isValidCoord(lat, lon)) return null;

  const now = Date.now();
  const key = cacheKey(lat, lon);
  if (aqiCache.data && aqiCache.key === key && now - aqiCache.timestamp < AQI_CACHE_TTL) {
    return aqiCache.data;
  }

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,pm2_5,pm10,us_aqi`;

  const data = await fetchJson<OpenMeteoAqi>(url);
  const current = data?.current;
  if (!current) return aqiCache.data;

  const eaqi = current.european_aqi ?? current.us_aqi ?? 0;
  const result: AirQuality = {
    aqi: Math.round(eaqi),
    pm25: Math.round(current.pm2_5 ?? 0),
    pm10: Math.round(current.pm10 ?? 0),
    label: getAqiLabel(eaqi),
    color: getAqiColor(eaqi),
  };

  aqiCache = { data: result, timestamp: now, key };
  return result;
}

export function getAqiLabel(aqi: number): string {
  if (aqi <= 20) return 'Excelente';
  if (aqi <= 40) return 'Boa';
  if (aqi <= 60) return 'Moderada';
  if (aqi <= 80) return 'Ruim';
  if (aqi <= 100) return 'Muito Ruim';
  return 'Péssima';
}

export function getAqiColor(aqi: number): string {
  if (aqi <= 20) return '#22c55e';
  if (aqi <= 40) return '#84cc16';
  if (aqi <= 60) return '#eab308';
  if (aqi <= 80) return '#f97316';
  if (aqi <= 100) return '#ef4444';
  return '#a855f7';
}

/**
 * Ganho de elevação via Open-Meteo Elevation API (gratuita).
 * Aceita [lat, lon] ou {lat, lon}.
 */
export async function fetchElevationGain(
  routePoints: Array<RoutePoint | { lat: number; lon: number }>
): Promise<number> {
  if (!Array.isArray(routePoints) || routePoints.length < 2) return 0;

  // A API aceita no máximo 100 coordenadas por requisição.
  const step = Math.max(1, Math.ceil(routePoints.length / 100));
  const sampled = routePoints.filter((_, i) => i % step === 0 || i === routePoints.length - 1);

  const lats = sampled.map((p) => (Array.isArray(p) ? p[0] : p.lat));
  const lons = sampled.map((p) => (Array.isArray(p) ? p[1] : p.lon));
  if (lats.some((v) => !Number.isFinite(v)) || lons.some((v) => !Number.isFinite(v))) return 0;

  const url =
    `https://api.open-meteo.com/v1/elevation?latitude=${lats.map((v) => v.toFixed(5)).join(',')}` +
    `&longitude=${lons.map((v) => v.toFixed(5)).join(',')}`;

  const data = await fetchJson<{ elevation?: number[] }>(url);
  const elevations = data?.elevation;
  if (!Array.isArray(elevations) || elevations.length < 2) return 0;

  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0.5) gain += diff; // ignora ruído abaixo de 0,5 m
  }
  return Math.round(gain);
}

// ─── Geocodificação reversa (Nominatim / OSM, gratuito) ───

const geocodeCache = new Map<string, { label: string } | null>();

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ label: string } | null> {
  if (!isValidCoord(lat, lon)) return null;

  const key = cacheKey(lat, lon);
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
    `&format=json&zoom=14&addressdetails=1`;

  interface NominatimResponse {
    name?: string;
    address?: Record<string, string>;
  }
  const data = await fetchJson<NominatimResponse>(url, {
    headers: { Accept: 'application/json' },
  });
  if (!data) return null;

  const addr = data.address ?? {};
  const label =
    addr.suburb ||
    addr.neighbourhood ||
    addr.city_district ||
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    data.name ||
    null;

  const city = addr.city || addr.town || addr.village || addr.state || '';
  const result = label
    ? { label: city && label !== city ? `${label}, ${city}` : label }
    : null;

  geocodeCache.set(key, result);
  if (geocodeCache.size > 50) {
    const first = geocodeCache.keys().next().value;
    if (first) geocodeCache.delete(first);
  }
  return result;
}

/** Localização aproximada por IP — fallback gratuito e sem chave. */
export async function fetchWeatherByIP(): Promise<{
  weather: WeatherSnapshot | null;
  lat: number;
  lon: number;
  city: string | null;
} | null> {
  const now = Date.now();
  if (ipCache.data && now - ipCache.timestamp < IP_CACHE_TTL) {
    const { lat, lon, city } = ipCache.data;
    return { weather: await fetchCurrentWeather(lat, lon), lat, lon, city };
  }

  const endpoints: Array<() => Promise<IpLocation | null>> = [
    async () => {
      const loc = await fetchJson<{ latitude?: number; longitude?: number; city?: string }>(
        'https://ipapi.co/json/'
      );
      if (!loc) return null;
      return {
        lat: Number(loc.latitude),
        lon: Number(loc.longitude),
        city: loc.city ?? null,
      };
    },
    async () => {
      const loc = await fetchJson<{
        success?: boolean;
        latitude?: number;
        longitude?: number;
        city?: string;
      }>('https://ipwho.is/');
      if (!loc?.success) return null;
      return {
        lat: Number(loc.latitude),
        lon: Number(loc.longitude),
        city: loc.city ?? null,
      };
    },
  ];

  for (const tryEndpoint of endpoints) {
    const loc = await tryEndpoint();
    if (!loc || !isValidCoord(loc.lat, loc.lon)) continue;
    ipCache = { data: loc, timestamp: now };
    return {
      weather: await fetchCurrentWeather(loc.lat, loc.lon),
      lat: loc.lat,
      lon: loc.lon,
      city: loc.city,
    };
  }

  if (ipCache.data) {
    const { lat, lon, city } = ipCache.data;
    return { weather: await fetchCurrentWeather(lat, lon), lat, lon, city };
  }
  return null;
}

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

/** Score 0–100 das condições para correr, combinando clima e qualidade do ar. */
export function getRunningConditionsScore(
  weather: WeatherSnapshot | null,
  aqi: AirQuality | null
): ConditionsScore | null {
  if (!weather) return null;
  let score = 100;

  // Faixa ideal ~12–20 °C
  const temp = weather.temperature;
  if (temp < 5 || temp > 32) score -= 35;
  else if (temp < 10 || temp > 28) score -= 20;
  else if (temp < 12 || temp > 24) score -= 8;

  if (weather.windSpeed > 30) score -= 25;
  else if (weather.windSpeed > 20) score -= 12;
  else if (weather.windSpeed > 15) score -= 5;

  if (RAIN_CODES.has(weather.weatherCode)) score -= 30;

  if (weather.humidity > 85) score -= 15;
  else if (weather.humidity > 75) score -= 8;

  if (weather.uvIndex >= 8) score -= 15;
  else if (weather.uvIndex >= 6) score -= 8;

  if (aqi) {
    if (aqi.aqi > 80) score -= 30;
    else if (aqi.aqi > 60) score -= 18;
    else if (aqi.aqi > 40) score -= 8;
  }

  score = Math.max(0, Math.min(100, score));
  let label = 'Excelente';
  if (score < 40) label = 'Desfavorável';
  else if (score < 60) label = 'Regular';
  else if (score < 80) label = 'Boa';

  return { score, label };
}

/** Recomendação textual objetiva para o corredor. */
export function getRunningAdvice(
  weather: WeatherSnapshot | null,
  aqi: AirQuality | null
): string | null {
  if (!weather) return null;
  if (RAIN_CODES.has(weather.weatherCode)) return 'Chuva prevista — leve corta-vento e reduza o ritmo em curvas.';
  if (weather.temperature >= 28) return 'Calor forte — hidrate-se antes, durante e prefira sombra.';
  if (weather.temperature <= 8) return 'Frio — faça aquecimento mais longo e use camadas leves.';
  if (weather.uvIndex >= 8) return 'UV muito alto — protetor solar e boné são recomendados.';
  if (aqi && aqi.aqi > 80) return 'Ar de má qualidade — considere treinar em ambiente fechado.';
  if (weather.windSpeed > 25) return 'Vento forte — comece contra o vento e volte a favor.';
  return 'Condições favoráveis — bom treino!';
}
