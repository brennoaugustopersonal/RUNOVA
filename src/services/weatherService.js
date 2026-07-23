/**
 * Serviço de Clima Real via API pública Open-Meteo (sem chave de API necessária).
 * Retorna temperatura atual e condição do tempo com base em coordenadas GPS.
 */

// Mapa de códigos WMO para descrições e emojis
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

/**
 * Busca o clima atual na API pública Open-Meteo.
 * @param {number} lat - Latitude GPS
 * @param {number} lon - Longitude GPS
 * @returns {Promise<{temperature: number, description: string, emoji: string} | null>}
 */
export async function fetchCurrentWeather(lat, lon) {
  if (!lat || !lon) return null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const current = data?.current_weather;

    if (!current) return null;

    const code = current.weathercode ?? 0;
    const info = WMO_CODES[code] || { desc: 'Indisponível', emoji: '🌡️' };

    return {
      temperature: Math.round(current.temperature),
      description: info.desc,
      emoji: info.emoji,
      windSpeed: Math.round(current.windspeed),
    };
  } catch (e) {
    return null;
  }
}
