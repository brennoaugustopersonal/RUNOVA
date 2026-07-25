import { kmToMiles, paceMinKmToMinMile } from './calculations';
import type { UnitSystem } from '../types/domain';

type MaybeNumber = number | null | undefined;

/** Formata um tempo em segundos para mm:ss ou hh:mm:ss. */
export function formatTime(totalSeconds: MaybeNumber): string {
  const value = Number(totalSeconds);
  if (!value || !Number.isFinite(value) || value < 0) {
    return '00:00';
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);

  const pad = (num: number) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Formata uma duração longa de forma compacta: "1h 24min" / "42min". */
export function formatDuration(totalSeconds: MaybeNumber): string {
  const value = Number(totalSeconds);
  if (!value || !Number.isFinite(value) || value <= 0) return '0min';
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return `${minutes}min`;
}

/** Formata o ritmo (minutos decimais por km) como 5'30". */
export function formatPace(paceInMinutes: MaybeNumber, units: UnitSystem = 'metric'): string {
  const raw = Number(paceInMinutes);
  if (!raw || !Number.isFinite(raw) || raw <= 0) {
    return "--'--\"";
  }

  const value = units === 'imperial' ? paceMinKmToMinMile(raw) : raw;
  const totalSecs = Math.round(value * 60);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  return `${mins}'${String(secs).padStart(2, '0')}"`;
}

/** Formata distância com N casas decimais, respeitando o sistema de unidades. */
export function formatDistance(
  distanceKm: MaybeNumber,
  decimals = 2,
  units: UnitSystem = 'metric'
): string {
  const raw = Number(distanceKm);
  if (distanceKm == null || !Number.isFinite(raw)) {
    return decimals > 0 ? `0,${'0'.repeat(decimals)}` : '0';
  }
  const value = units === 'imperial' ? kmToMiles(raw) : raw;
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formata velocidade em km/h (ou mph). */
export function formatSpeed(speedKmh: MaybeNumber, units: UnitSystem = 'metric'): string {
  const raw = Number(speedKmh);
  if (!raw || !Number.isFinite(raw) || raw < 0) {
    return '0,0';
  }
  const value = units === 'imperial' ? kmToMiles(raw) : raw;
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Rótulo curto da unidade de distância. */
export function distanceUnitLabel(units: UnitSystem = 'metric'): string {
  return units === 'imperial' ? 'mi' : 'km';
}

/** Rótulo curto da unidade de velocidade. */
export function speedUnitLabel(units: UnitSystem = 'metric'): string {
  return units === 'imperial' ? 'mph' : 'km/h';
}

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/** Formata data relativa amigável em português. */
export function formatDate(dateString: string | number | Date | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
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

  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} às ${timeStr}`;
}

/** Formata número inteiro com separador de milhar pt-BR. */
export function formatInteger(value: MaybeNumber): string {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return '0';
  return Math.round(raw).toLocaleString('pt-BR');
}
