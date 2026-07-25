/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface WakeLockSentinelLike extends EventTarget {
  release(): Promise<void>;
}

interface Navigator {
  /** Web Bluetooth — disponível apenas em contextos seguros e navegadores Chromium. */
  bluetooth?: {
    requestDevice(options: unknown): Promise<BluetoothDeviceLike>;
    getAvailability?(): Promise<boolean>;
  };
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
}

interface BluetoothDeviceLike extends EventTarget {
  name?: string;
  gatt?: {
    connect(): Promise<BluetoothServerLike>;
    disconnect(): void;
    connected: boolean;
  };
}

interface BluetoothServerLike {
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
}

interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}

interface BluetoothCharacteristicLike extends EventTarget {
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  readValue(): Promise<DataView>;
  value?: DataView;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
