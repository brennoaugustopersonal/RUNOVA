import { useCallback, useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { voiceService } from '../services/voiceService';
import type { UserSettings } from '../types/domain';

/**
 * Configurações do usuário com sincronização entre abas.
 * O peso e a idade alimentam as estimativas de calorias e FC do motor de corrida.
 */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => getSettings());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'runova_settings_v1') {
        setSettings(getSettings());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    const next = saveSettings(patch);
    if (patch.voiceMuted !== undefined) {
      voiceService.setMuted(next.voiceMuted);
    }
    setSettings(next);
    return next;
  }, []);

  return { settings, updateSettings };
}
