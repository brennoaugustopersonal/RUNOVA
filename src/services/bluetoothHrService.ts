/**
 * Monitor cardíaco Bluetooth LE (perfil GATT Heart Rate 0x180D)
 * via Web Bluetooth — gratuito e sem dependências.
 */

const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
const CONNECT_TIMEOUT_MS = 20000;

type HeartRateCallback = (bpm: number) => void;
type BatteryCallback = (level: number) => void;
type DisconnectCallback = () => void;

class BluetoothHRService {
  private device: BluetoothDeviceLike | null = null;
  private server: BluetoothServerLike | null = null;
  private characteristic: BluetoothCharacteristicLike | null = null;
  private _onHeartRate: HeartRateCallback | null = null;
  private _onBatteryLevel: BatteryCallback | null = null;
  private _onDisconnect: DisconnectCallback | null = null;
  private _connected = false;
  private _batteryLevel: number | null = null;
  private _deviceName: string | null = null;
  private handleValueChanged = (event: Event) => {
    const target = event.target as BluetoothCharacteristicLike;
    if (!target?.value) return;
    const hr = this.parseHeartRate(target.value);
    if (hr > 0 && this._onHeartRate) this._onHeartRate(hr);
  };

  get connected(): boolean {
    return this._connected;
  }

  get batteryLevel(): number | null {
    return this._batteryLevel;
  }

  get deviceName(): string | null {
    return this._deviceName;
  }

  set onHeartRate(callback: HeartRateCallback | null) {
    this._onHeartRate = callback;
  }

  set onBatteryLevel(callback: BatteryCallback | null) {
    this._onBatteryLevel = callback;
  }

  set onDisconnect(callback: DisconnectCallback | null) {
    this._onDisconnect = callback;
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async requestDevice(): Promise<BluetoothDeviceLike> {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      throw new Error('Web Bluetooth não suportado neste navegador');
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: [BATTERY_SERVICE_UUID],
    });

    device.addEventListener('gattserverdisconnected', () => {
      this._connected = false;
      this.characteristic = null;
      this.server = null;
      this._onDisconnect?.();
    });

    this.device = device;
    this._deviceName = device.name ?? null;
    return device;
  }

  async connect(): Promise<void> {
    if (!this.device?.gatt) throw new Error('Nenhum dispositivo selecionado');
    if (this._connected) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      this.server = await Promise.race([
        this.device.gatt.connect(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Tempo limite de conexão Bluetooth excedido')),
            CONNECT_TIMEOUT_MS
          );
        }),
      ]);
    } catch {
      this.cleanupAfterFailure();
      throw new Error('Tempo limite de conexão Bluetooth excedido');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    try {
      const service = await this.server.getPrimaryService(HEART_RATE_SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);
      this.characteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleValueChanged
      );
      await this.characteristic.startNotifications();
      this._connected = true;
    } catch {
      this.cleanupAfterFailure();
      throw new Error('Não foi possível ler a frequência cardíaca do dispositivo');
    }

    // Nível de bateria é opcional — nunca deve derrubar a conexão.
    try {
      const batService = await this.server.getPrimaryService(BATTERY_SERVICE_UUID);
      const batChar = await batService.getCharacteristic(BATTERY_LEVEL_UUID);
      const batValue = await batChar.readValue();
      this._batteryLevel = batValue.getUint8(0);
      this._onBatteryLevel?.(this._batteryLevel);
    } catch {
      this._batteryLevel = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.characteristic) {
      this.characteristic.removeEventListener(
        'characteristicvaluechanged',
        this.handleValueChanged
      );
      try {
        await this.characteristic.stopNotifications();
      } catch {
        // dispositivo já pode ter saído de alcance
      }
    }
    try {
      this.device?.gatt?.disconnect();
    } catch {
      // ignorado
    }
    this._connected = false;
    this.characteristic = null;
    this.server = null;
    this.device = null;
    this._batteryLevel = null;
    this._deviceName = null;
  }

  private cleanupAfterFailure(): void {
    this._connected = false;
    try {
      this.device?.gatt?.disconnect();
    } catch {
      // ignorado — evita deixar um GATT órfão
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  /** Decodifica o formato do characteristic 0x2A37 (flag de 8 ou 16 bits). */
  private parseHeartRate(value: DataView): number {
    if (!value || value.byteLength < 2) return 0;
    const flags = value.getUint8(0);
    const is16Bit = (flags & 0x1) === 1;
    if (is16Bit) {
      return value.byteLength >= 3 ? value.getUint16(1, true) : 0;
    }
    return value.getUint8(1);
  }
}

export const bluetoothHrService = new BluetoothHRService();
