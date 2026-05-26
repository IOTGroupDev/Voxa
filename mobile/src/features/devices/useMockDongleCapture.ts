import { useEffect } from 'react';
import { ButtonGesture, CaptureSource } from '@voxa/shared';
import { mockDongleService } from '../../lib/bluetooth/singleton';
import { runMockCapture } from '../capture/capture-flow';

function normalizeGesture(type: string): ButtonGesture {
  if (type === 'press_and_hold_start' || type === 'press_and_hold_end') {
    return ButtonGesture.PRESS_AND_HOLD;
  }

  return type as ButtonGesture;
}

export function useMockDongleCapture() {
  useEffect(() => {
    return mockDongleService.onButtonEvent((event) => {
      void mockDongleService.getCaptureAvailability().then((availability) => {
        if (!availability.canStartPhoneRecording) {
          void mockDongleService.vibrate();
          return;
        }

        void runMockCapture({
          source: CaptureSource.DONGLE,
          buttonGesture: normalizeGesture(event.type),
          deviceId: event.deviceId,
        });
      });
    });
  }, []);
}
