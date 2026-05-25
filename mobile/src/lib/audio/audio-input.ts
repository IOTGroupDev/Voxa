import { BluetoothAudioInput } from '../bluetooth';

export class MockBluetoothAudioInput implements BluetoothAudioInput {
  async getPreferredInputDevice(): Promise<string | null> {
    return 'mock-bluetooth-microphone';
  }

  async isBluetoothMicrophoneAvailable(): Promise<boolean> {
    return true;
  }
}

