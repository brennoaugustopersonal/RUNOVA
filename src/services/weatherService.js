const WMO_CODES = {
  0: { desc: 'Céu Limpo', emoji: '☀️' },
  1: { desc: 'Predominante Limpo', emoji: '🌤️' },
  2: { desc: 'Parcialmente Nublado', emoji: '⛅' },
  3: { desc: 'Nublado', emoji: '☁️' },
  45: { desc: 'Nevoeiro', emoji: '🌫️' },
  48: { desc: 'Nevoeiro com Geada', emoji: '🌫️' },
  51: { desc: 'Chuvisco Leve', emoji: '🌦️' },
  53: { desc: 'Chuvisco Moderado', emoji: '🌦️' },
  55: { desc: 'Chuvisco Forte', emoji: '🌧️' },
  61: { desc: 'Chuva Leve', emoji: '🌧️' },
  63: { desc: 'Chuva Moderada', emoji: '🌧️' },
  65: { desc: 'Chuva Forte', emoji: '⛈️' },
  71: { desc: 'Neve Leve', emoji: '🌨️' },
  73: { desc: 'Neve Moderada', emoji: '❄️' },
  75: { desc: 'Neve Forte', emoji: '❄️' },
  80: { desc: 'Pancada de Chuva', emoji: '🌦️' },
  81: { desc: 'Pancada Moderada', emoji: '🌧️' },
  82: { desc: 'Pancada Forte', emoji: '⛈️' },
  95: { desc: 'Trovoada', emoji: '⛈️' },
  96: { desc: 'Trovoada com Granizo', emoji: '⛈️' },
  99: { desc: 'Trovoada com Granizo Forte', emoji: '⛈️' },
};

const CACHE_TTL = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

const IP_CACHE_TTL = 60 * 60 * 1000;
let ipCache = { data: null, timestamp: 0 };

export function getWeatherEmoji(code) {
  const info = WMO_CODES[code];
  return info ? info.emoji : '🌡️';
}

export function getWeatherDescription(code) {
  const info = WMO_CODES[code];
  return info ? info.desc : 'Indisponível';
}

export function resetWeatherCache() {
  cache = { data: null, timestamp: 0 };
}

export function resetAllCache() {
  cache = { data: null, timestamp: 0 };
  ipCache = { data: null, timestamp: 0 };
}

export async function fetchCurrentWeather(lat, lon) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;

  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) return cache.data;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const current = data?.current_weather;

    if (!current) return null;

    const code = current.weathercode ?? 0;
    const info = WMO_CODES[code] || { desc: 'Indisponível', emoji: '🌡️' };

    const result = {
      temperature: Math.round(current.temperature),
      description: info.desc,
      emoji: info.emoji,
      windSpeed: Math.round(current.windspeed),
    };

    cache = { data: result, timestamp: now };
    return result;
  } catch (e) {
    return cache.data || null;
  }
}

export async function fetchWeatherForecast(lat, lon) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&forecast_days=3&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const daily = data?.daily;

    if (!daily || !daily.time) return null;

    return daily.time.map((date, i) => {
      const code = daily.weathercode[i] ?? 0;
      return {
        date,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        precipitation: daily.precipitation_sum[i] ?? 0,
        windSpeed: Math.round(daily.windspeed_10m_max[i]),
        emoji: getWeatherEmoji(code),
        description: getWeatherDescription(code),
      };
    });
  } catch (e) {
    return null;
  }
}

export async function fetchWeatherByIP() {
  const now = Date.now();
  if (ipCache.data && now - ipCache.timestamp < IP_CACHE_TTL) {
    const weather = await fetchCurrentWeather(ipCache.data.lat, ipCache.data.lon);
    return { weather, lat: ipCache.data.lat, lon: ipCache.data.lon };
  }

  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;

    const location = await res.json();
    const lat = parseFloat(location.latitude);
    const lon = parseFloat(location.longitude);

    if (isNaN(lat) || isNaN(lon)) return null;

    ipCache = { data: { lat, lon }, timestamp: now };
    const weather = await fetchCurrentWeather(lat, lon);
    return { weather, lat, lon };
  } catch (e) {
    if (ipCache.data) {
      const weather = await fetchCurrentWeather(ipCache.data.lat, ipCache.data.lon);
      return { weather, lat: ipCache.data.lat, lon: ipCache.data.lon };
    }
    return null;
  }
}
