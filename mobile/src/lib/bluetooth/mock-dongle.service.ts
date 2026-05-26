import { ButtonGesture, CaptureAvailability, DongleConnectionState } from '@voxa/shared';
import {
  DongleBatteryStatus,
  DongleButtonEvent,
  DongleConnection,
  DongleControlService,
} from './types';

export class MockDongleService implements DongleControlService {
  private connection: DongleConnection | null = null;
  private handlers = new Set<(event: DongleButtonEvent) => void>();

  async connect(deviceId: string): Promise<DongleConnection> {
    this.connection = {
      id: deviceId,
      name: 'Mock Memory Dongle',
      state: DongleConnectionState.CONNECTED,
      firmwareVersion: 'mock-0.1.0',
    };
    return this.connection;
  }

  async disconnect(): Promise<void> {
    this.connection = null;
  }

  getConnection(): DongleConnection | null {
    return this.connection;
  }

  async getCaptureAvailability() {
    if (!this.connection) {
      return {
        availability: CaptureAvailability.PHONE_UNAVAILABLE,
        canStartPhoneRecording: false,
        reason: 'Phone app is not connected to the mock dongle.',
      };
    }

    return {
      availability: CaptureAvailability.READY,
      canStartPhoneRecording: true,
    };
  }

  async getBatteryStatus(): Promise<DongleBatteryStatus> {
    return {
      levelPercent: 82,
      isLow: false,
      updatedAt: new Date().toISOString(),
    };
  }

  async setRecordingIndicator(active: boolean): Promise<void> {
    // TODO: Map this to BLE indicator commands in the production implementation.
    void active;
  }

  async vibrate(): Promise<void> {
    // TODO: Map this to a BLE VIBRATE command in the production implementation.
  }

  onButtonEvent(handler: (event: DongleButtonEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emitMockButtonEvent(type: DongleButtonEvent['type'] = ButtonGesture.SINGLE_PRESS): void {
    if (!this.connection) {
      return;
    }

    const event: DongleButtonEvent = {
      type,
      deviceId: this.connection.id,
      occurredAt: new Date().toISOString(),
    };

    this.handlers.forEach((handler) => handler(event));
  }
}
