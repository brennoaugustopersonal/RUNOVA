import { describe, it, expect } from 'vitest';
import { getBadges } from '../services/badgeService';

describe('getBadges', () => {
  it('retorna 12 badges', () => {
    const badges = getBadges([]);
    expect(badges.length).toBe(12);
  });

  it('first_run desbloqueado com 1+ corridas', () => {
    const badges = getBadges([{ distanceKm: 1 }]);
    const badge = badges.find((b) => b.id === 'first_run');
    expect(badge.unlocked).toBe(true);
    expect(badge.progress).toBe(1);
  });

  it('speed_demon desbloqueado com pace < 5.5', () => {
    const badges = getBadges([{ paceMinKm: 5.0 }]);
    const badge = badges.find((b) => b.id === 'speed_demon');
    expect(badge.unlocked).toBe(true);
  });

  it('endurance_5k desbloqueado com corrida de 5km', () => {
    const badges = getBadges([{ distanceKm: 5.0 }]);
    const badge = badges.find((b) => b.id === 'endurance_5k');
    expect(badge.unlocked).toBe(true);
    expect(badge.progress).toBe(1);
  });

  it('runner_pro desbloqueado com 10km total', () => {
    const badges = getBadges([
      { distanceKm: 6 },
      { distanceKm: 4 },
    ]);
    const badge = badges.find((b) => b.id === 'runner_pro');
    expect(badge.unlocked).toBe(true);
  });

  it('century desbloqueado com 100km total', () => {
    const badges = getBadges(Array.from({ length: 20 }, () => ({ distanceKm: 5 })));
    const badge = badges.find((b) => b.id === 'century');
    expect(badge.unlocked).toBe(true);
  });

  it('gps_pioneer desbloqueado quando mode=gps', () => {
    const badges = getBadges([{ distanceKm: 1, mode: 'gps' }]);
    const badge = badges.find((b) => b.id === 'gps_pioneer');
    expect(badge.unlocked).toBe(true);
  });

  it('todos badges bloqueados com array vazio', () => {
    const badges = getBadges([]);
    badges.forEach((b) => {
      expect(b.unlocked).toBe(false);
    });
  });

  it('progress values estão entre 0 e 1', () => {
    const badges = getBadges([{ distanceKm: 3, paceMinKm: 6, speedMultiplier: 2 }]);
    badges.forEach((b) => {
      if (b.progress !== undefined) {
        expect(b.progress).toBeGreaterThanOrEqual(0);
        expect(b.progress).toBeLessThanOrEqual(1);
      }
    });
  });
});
