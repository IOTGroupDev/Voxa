"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLUETOOTH_SERVICE = exports.QUEUE_NAMES = exports.STORAGE_BUCKETS = void 0;
exports.STORAGE_BUCKETS = {
    AUDIO_PRIVATE: 'audio-private',
    USER_MEDIA: 'user-media',
};
exports.QUEUE_NAMES = {
    RECORDING_UPLOADED: 'recording_uploaded',
    TRANSCRIPTION: 'transcription_queue',
    CLASSIFICATION: 'classification_queue',
    SUMMARY: 'summary_queue',
    ACTION_EXTRACTION: 'action_extraction_queue',
    REMINDER_SUGGESTION: 'reminder_suggestion_queue',
    EMBEDDING: 'embedding_queue',
    TIMELINE_UPDATE: 'timeline_update_queue',
    INSIGHT: 'insight_queue',
    CLEANUP: 'cleanup_queue',
};
exports.BLUETOOTH_SERVICE = {
    NAME: 'MemoryDongleControlService',
    CHARACTERISTICS: [
        'device_status',
        'battery_level',
        'button_event',
        'recording_state',
        'firmware_version',
        'device_id',
    ],
    COMMANDS: [
        'GET_STATUS',
        'GET_BATTERY',
        'SET_RECORDING_INDICATOR_ON',
        'SET_RECORDING_INDICATOR_OFF',
        'VIBRATE',
        'PING',
    ],
};
//# sourceMappingURL=index.js.map