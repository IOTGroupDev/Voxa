import { Injectable } from '@nestjs/common';

@Injectable()
export class PrivacyService {
  getDefaultRetentionPolicy() {
    // TODO: Load per-user privacy settings and retention choices.
    return {
      autoDeleteAudioAfterTranscription: false,
      dataExportEnabled: true,
      accountDeletionSupported: true,
    };
  }
}

