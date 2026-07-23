/**
 * Calcula a distância entre duas coordenadas geográficas em km usando a Fórmula de Haversine.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula ritmo médio em minutos decimais por km
 */
export function calculatePace(distanceKm, durationSeconds) {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) {
    return 0;
  }
  const minutes = durationSeconds / 60;
  return minutes / distanceKm;
}

/**
 * Calcula velocidade média em km/h
 */
export function calculateSpeed(distanceKm, durationSeconds) {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) {
    return 0;
  }
  const hours = durationSeconds / 3600;
  return distanceKm / hours;
}

/**
 * Estima calorias queimadas baseadas em distância, velocidade e peso médio
 */
export function calculateCalories(distanceKm, durationSeconds, weightKg = 72) {
  if (!distanceKm || distanceKm <= 0) return 0;
  
  const speedKmh = calculateSpeed(distanceKm, durationSeconds);
  let met = 7.0;
  if (speedKmh > 12) met = 11.5;
  else if (speedKmh > 10) met = 9.8;
  else if (speedKmh > 8) met = 8.3;

  const durationHours = durationSeconds / 3600;
  const calories = met * weightKg * durationHours;
  
  return Math.round(calories > 0 ? calories : distanceKm * 65);
}

/**
 * Compara dois ritmos (min/km) e retorna a diferença percentual e status
 */
export function calculatePerformanceDiff(currentPace, targetOrAvgPace) {
  if (!currentPace || !targetOrAvgPace || currentPace <= 0 || targetOrAvgPace <= 0) {
    return { percent: 0, isBetter: true, diffFormatted: '0%' };
  }

  const diffPercent = ((targetOrAvgPace - currentPace) / targetOrAvgPace) * 100;
  const isBetter = diffPercent >= 0;
  const absPercent = Math.abs(diffPercent).toFixed(1);

  return {
    percent: diffPercent,
    isBetter,
    diffFormatted: `${isBetter ? '+' : '-'}${absPercent}%`,
  };
}
