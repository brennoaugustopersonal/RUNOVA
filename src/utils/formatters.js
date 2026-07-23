/**
 * Formata um tempo em segundos para mm:ss ou hh:mm:ss
 */
export function formatTime(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0 || !isFinite(totalSeconds)) {
    return '00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formata o ritmo (ritmo médio / min por km)
 */
export function formatPace(paceInMinutes) {
  if (!paceInMinutes || isNaN(paceInMinutes) || !isFinite(paceInMinutes) || paceInMinutes <= 0) {
    return "--'--\"";
  }

  const totalSecs = Math.round(paceInMinutes * 60);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  return `${mins}'${String(secs).padStart(2, '0')}"`;
}

/**
 * Formata distância em km com 1 ou 2 casas decimais
 */
export function formatDistance(distanceKm, decimals = 2) {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return '0,00';
  }
  return Number(distanceKm).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formata velocidade (km/h)
 */
export function formatSpeed(speedKmh) {
  if (!speedKmh || isNaN(speedKmh) || speedKmh < 0) {
    return '0,0';
  }
  return Number(speedKmh).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Formata data relativa amigável em português
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Hoje às ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ontem às ${timeStr}`;
  }

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} de ${monthNames[date.getMonth()]} às ${timeStr}`;
}
