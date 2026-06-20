"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiJobType = exports.DongleRecordingSyncStatus = exports.CaptureAvailability = exports.AiProcessingMode = exports.TranscriptRetentionMode = exports.AudioRetentionMode = exports.DeviceType = exports.DeviceStatus = exports.DongleConnectionState = exports.InsightType = exports.AiJobStatus = exports.RecordingStatus = exports.ButtonGesture = exports.CaptureSource = exports.MemoryEventType = void 0;
var MemoryEventType;
(function (MemoryEventType) {
    MemoryEventType["QUICK_NOTE"] = "quick_note";
    MemoryEventType["TASK"] = "task";
    MemoryEventType["IDEA"] = "idea";
    MemoryEventType["IMPORTANT"] = "important";
    MemoryEventType["REFLECTION"] = "reflection";
    MemoryEventType["MEETING"] = "meeting";
    MemoryEventType["MANUAL"] = "manual";
})(MemoryEventType || (exports.MemoryEventType = MemoryEventType = {}));
var CaptureSource;
(function (CaptureSource) {
    CaptureSource["DONGLE"] = "dongle";
    CaptureSource["MOBILE_APP"] = "mobile_app";
    CaptureSource["AIRPODS_SHORTCUT"] = "airpods_shortcut";
})(CaptureSource || (exports.CaptureSource = CaptureSource = {}));
var ButtonGesture;
(function (ButtonGesture) {
    ButtonGesture["SINGLE_PRESS"] = "single_press";
    ButtonGesture["DOUBLE_PRESS"] = "double_press";
    ButtonGesture["TRIPLE_PRESS"] = "triple_press";
    ButtonGesture["LONG_PRESS"] = "long_press";
    ButtonGesture["PRESS_AND_HOLD"] = "press_and_hold";
    ButtonGesture["HOLD_AND_SPEAK"] = "hold_and_speak";
})(ButtonGesture || (exports.ButtonGesture = ButtonGesture = {}));
var RecordingStatus;
(function (RecordingStatus) {
    RecordingStatus["CREATED"] = "created";
    RecordingStatus["RECORDING"] = "recording";
    RecordingStatus["UPLOADING"] = "uploading";
    RecordingStatus["UPLOADED"] = "uploaded";
    RecordingStatus["PROCESSING"] = "processing";
    RecordingStatus["COMPLETED"] = "completed";
    RecordingStatus["FAILED"] = "failed";
    RecordingStatus["DELETED"] = "deleted";
})(RecordingStatus || (exports.RecordingStatus = RecordingStatus = {}));
var AiJobStatus;
(function (AiJobStatus) {
    AiJobStatus["PENDING"] = "pending";
    AiJobStatus["PROCESSING"] = "processing";
    AiJobStatus["COMPLETED"] = "completed";
    AiJobStatus["FAILED"] = "failed";
    AiJobStatus["RETRYING"] = "retrying";
    AiJobStatus["CANCELLED"] = "cancelled";
})(AiJobStatus || (exports.AiJobStatus = AiJobStatus = {}));
var InsightType;
(function (InsightType) {
    InsightType["RECURRING_THEME"] = "recurring_theme";
    InsightType["UNRESOLVED_QUESTION"] = "unresolved_question";
    InsightType["SIMILAR_PAST_NOTE"] = "similar_past_note";
    InsightType["PROJECT_DIRECTION"] = "project_direction";
    InsightType["EMOTIONAL_PATTERN"] = "emotional_pattern";
    InsightType["FORGOTTEN_TASK"] = "forgotten_task";
    InsightType["DECISION_NEEDED"] = "decision_needed";
})(InsightType || (exports.InsightType = InsightType = {}));
var DongleConnectionState;
(function (DongleConnectionState) {
    DongleConnectionState["DISCONNECTED"] = "disconnected";
    DongleConnectionState["CONNECTING"] = "connecting";
    DongleConnectionState["CONNECTED"] = "connected";
    DongleConnectionState["RECORDING"] = "recording";
    DongleConnectionState["LOW_BATTERY"] = "low_battery";
    DongleConnectionState["ERROR"] = "error";
})(DongleConnectionState || (exports.DongleConnectionState = DongleConnectionState = {}));
var DeviceStatus;
(function (DeviceStatus) {
    DeviceStatus["PAIRED"] = "paired";
    DeviceStatus["DISCONNECTED"] = "disconnected";
    DeviceStatus["SYNCING"] = "syncing";
    DeviceStatus["ERROR"] = "error";
})(DeviceStatus || (exports.DeviceStatus = DeviceStatus = {}));
var DeviceType;
(function (DeviceType) {
    DeviceType["DONGLE"] = "dongle";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
var AudioRetentionMode;
(function (AudioRetentionMode) {
    AudioRetentionMode["DELETE_AFTER_PROCESSING"] = "delete_after_processing";
    AudioRetentionMode["KEEP_7_DAYS"] = "keep_7_days";
    AudioRetentionMode["KEEP_30_DAYS"] = "keep_30_days";
    AudioRetentionMode["KEEP_FOREVER"] = "keep_forever";
})(AudioRetentionMode || (exports.AudioRetentionMode = AudioRetentionMode = {}));
var TranscriptRetentionMode;
(function (TranscriptRetentionMode) {
    TranscriptRetentionMode["KEEP_FOREVER"] = "keep_forever";
    TranscriptRetentionMode["DELETE_AFTER_30_DAYS"] = "delete_after_30_days";
    TranscriptRetentionMode["DELETE_AFTER_90_DAYS"] = "delete_after_90_days";
})(TranscriptRetentionMode || (exports.TranscriptRetentionMode = TranscriptRetentionMode = {}));
var AiProcessingMode;
(function (AiProcessingMode) {
    AiProcessingMode["CLOUD"] = "cloud";
    AiProcessingMode["LOCAL_ONLY"] = "local_only";
    AiProcessingMode["HYBRID"] = "hybrid";
})(AiProcessingMode || (exports.AiProcessingMode = AiProcessingMode = {}));
var CaptureAvailability;
(function (CaptureAvailability) {
    CaptureAvailability["READY"] = "ready";
    CaptureAvailability["PHONE_LOCKED_READY"] = "phone_locked_ready";
    CaptureAvailability["PHONE_BACKGROUND_LIMITED"] = "phone_background_limited";
    CaptureAvailability["PHONE_UNAVAILABLE"] = "phone_unavailable";
})(CaptureAvailability || (exports.CaptureAvailability = CaptureAvailability = {}));
var DongleRecordingSyncStatus;
(function (DongleRecordingSyncStatus) {
    DongleRecordingSyncStatus["STORED_ON_DEVICE"] = "stored_on_device";
    DongleRecordingSyncStatus["METADATA_SYNCED"] = "metadata_synced";
    DongleRecordingSyncStatus["TRANSFER_IN_PROGRESS"] = "transfer_in_progress";
    DongleRecordingSyncStatus["TRANSFERRED_TO_PHONE"] = "transferred_to_phone";
    DongleRecordingSyncStatus["UPLOADED_TO_BACKEND"] = "uploaded_to_backend";
    DongleRecordingSyncStatus["CONFIRMED_BY_BACKEND"] = "confirmed_by_backend";
    DongleRecordingSyncStatus["SAFE_TO_DELETE_FROM_DEVICE"] = "safe_to_delete_from_device";
    DongleRecordingSyncStatus["SYNC_FAILED"] = "sync_failed";
})(DongleRecordingSyncStatus || (exports.DongleRecordingSyncStatus = DongleRecordingSyncStatus = {}));
var AiJobType;
(function (AiJobType) {
    AiJobType["TRANSCRIPTION"] = "transcription";
    AiJobType["CLASSIFICATION"] = "classification";
    AiJobType["SUMMARY"] = "summary";
    AiJobType["ACTION_EXTRACTION"] = "action_extraction";
    AiJobType["REMINDER_SUGGESTION"] = "reminder_suggestion";
    AiJobType["EMBEDDING"] = "embedding";
    AiJobType["TIMELINE_UPDATE"] = "timeline_update";
    AiJobType["INSIGHT"] = "insight";
    AiJobType["CLEANUP"] = "cleanup";
})(AiJobType || (exports.AiJobType = AiJobType = {}));
//# sourceMappingURL=index.js.map
