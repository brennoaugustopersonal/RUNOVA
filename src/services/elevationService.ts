/**
 * Elevação via Open-Meteo Elevation API (gratuita, sem chave).
 * Reexportado aqui para deixar as importações da UI mais claras.
 */
export { fetchElevationGain } from './weatherService';

/**
 * Multiplicador de esforço ajustado ao relevo.
 * Regra prática de campo: cada 10 m de ganho por km custa ~1 % de esforço extra,
 * limitado a +40 % para não distorcer estimativas em trilhas muito íngremes.
 */
export function estimateGradeEffort(
  distanceKm: number | null | undefined,
  elevationGainM: number | null | undefined
): number {
  const distance = Number(distanceKm);
  const gain = Number(elevationGainM);
  if (!Number.isFinite(distance) || distance <= 0) return 1;
  if (!Number.isFinite(gain) || gain <= 0) return 1;

  const gainPerKm = gain / distance;
  return 1 + Math.min(0.4, (gainPerKm / 10) * 0.01);
}

/** Classificação textual do relevo percorrido. */
export function describeTerrain(
  distanceKm: number | null | undefined,
  elevationGainM: number | null | undefined
): string {
  const distance = Number(distanceKm);
  const gain = Number(elevationGainM);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(gain) || gain <= 0) {
    return 'Plano';
  }
  const gainPerKm = gain / distance;
  if (gainPerKm < 5) return 'Plano';
  if (gainPerKm < 15) return 'Levemente ondulado';
  if (gainPerKm < 30) return 'Ondulado';
  if (gainPerKm < 60) return 'Montanhoso';
  return 'Trilha íngreme';
}
