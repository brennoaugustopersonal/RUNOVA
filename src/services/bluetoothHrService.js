const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

class BluetoothHRService {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this._onHeartRate = null;
    this._onBatteryLevel = null;
    this._onDisconnect = null;
    this._connected = false;
    this._batteryLevel = null;
  }

  get connected() {
    return this._connected;
  }

  get batteryLevel() {
    return this._batteryLevel;
  }

  set onHeartRate(callback) {
    this._onHeartRate = callback;
  }

  set onBatteryLevel(callback) {
    this._onBatteryLevel = callback;
  }

  set onDisconnect(callback) {
    this._onDisconnect = callback;
  }

  async requestDevice() {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      throw new Error('Web Bluetooth não suportado neste navegador');
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: [BATTERY_SERVICE_UUID],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this._connected = false;
      this.characteristic = null;
      this.server = null;
      if (this._onDisconnect) this._onDisconnect();
    });

    return this.device;
  }

  async connect() {
    if (!this.device) throw new Error('Nenhum dispositivo selecionado');
    if (this._connected) return;

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Tempo limite de conexão Bluetooth excedido')), 20000);
    });

    try {
      this.server = await Promise.race([
        this.device.gatt.connect(),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);
      this._connected = false;
      // Desconecta o dispositivo se ainda existir para evitar GATT órfão
      if (this.device) {
        try { this.device.gatt.disconnect(); } catch (_) {}
      }
      this.device = null;
      this.server = null;
      throw new Error('Tempo limite de conexão Bluetooth excedido');
    }
    const service = await this.server.getPrimaryService(HEART_RATE_SERVICE_UUID);

    this.characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);
    this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value;
      const hr = this._parseHeartRate(value);
      if (this._onHeartRate) this._onHeartRate(hr);
    });

    await this.characteristic.startNotifications();
    this._connected = true;

    try {
      const batService = await this.server.getPrimaryService(BATTERY_SERVICE_UUID);
      const batChar = await batService.getCharacteristic(BATTERY_LEVEL_UUID);
      const batValue = await batChar.readValue();
      this._batteryLevel = batValue.getUint8(0);
      if (this._onBatteryLevel) this._onBatteryLevel(this._batteryLevel);
    } catch (e) {
      this._batteryLevel = null;
    }
  }

  async disconnect() {
    if (this.device && this._connected) {
      if (this.characteristic) {
        try {
          await this.characteristic.stopNotifications();
        } catch (e) { }
      }
      this.device.gatt.disconnect();
    }
    this._connected = false;
    this.characteristic = null;
    this.server = null;
    this.device = null;
  }

  _parseHeartRate(value) {
    const flags = value.getUint8(0);
    const rate16Bit = !!(flags & 0x1);
    if (rate16Bit) {
      return value.getUint16(1, true);
    }
    return value.getUint8(1);
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }
}

export const bluetoothHrService = new BluetoothHRService();
