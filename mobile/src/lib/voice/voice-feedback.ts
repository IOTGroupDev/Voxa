import * as Speech from 'expo-speech';
import { Language } from '@/state/language.store';
import { useVoiceFeedbackStore } from '@/state/voice-feedback.store';

type VoiceFeedbackEvent =
  | 'recordingStarted'
  | 'recordingStopped'
  | 'recordingSynced'
  | 'recordingSavedLocally'
  | 'recordingStartFailed'
  | 'recordingStopFailed'
  | 'dongleCapture';

const messages: Record<Language, Record<VoiceFeedbackEvent, string>> = {
  en: {
    recordingStarted: 'Recording.',
    recordingStopped: 'Stopped.',
    recordingSynced: 'Saved.',
    recordingSavedLocally: 'Saved on this phone.',
    recordingStartFailed: 'Could not start.',
    recordingStopFailed: 'Could not stop.',
    dongleCapture: 'Open recording to use the dongle.',
  },
  ru: {
    recordingStarted: 'Записываю.',
    recordingStopped: 'Остановлено.',
    recordingSynced: 'Сохранено.',
    recordingSavedLocally: 'Сохранено на телефоне.',
    recordingStartFailed: 'Не удалось начать.',
    recordingStopFailed: 'Не удалось остановить.',
    dongleCapture: 'Откройте запись для Voxa dongle.',
  },
  es: {
    recordingStarted: 'Grabando.',
    recordingStopped: 'Detenido.',
    recordingSynced: 'Guardado.',
    recordingSavedLocally: 'Guardado en este teléfono.',
    recordingStartFailed: 'No se pudo iniciar.',
    recordingStopFailed: 'No se pudo detener.',
    dongleCapture: 'Abre grabación para usar el dongle.',
  },
};

const speechLanguage: Record<Language, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-ES',
};

export async function speakVoiceFeedback(event: VoiceFeedbackEvent, language: Language) {
  if (!useVoiceFeedbackStore.getState().enabled) {
    return;
  }

  const message = messages[language]?.[event] ?? messages.en[event];

  try {
    await Speech.stop();
    Speech.speak(message, {
      language: speechLanguage[language] ?? speechLanguage.en,
      pitch: 1,
      rate: 0.96,
    });
  } catch {
    // Voice feedback must never block capture.
  }
}
