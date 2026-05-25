import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKETS } from '@voxa/shared';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient | null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
  }

  createAudioUploadPath(userId: string, recordingId: string): string {
    return `${userId}/recordings/${recordingId}.m4a`;
  }

  async createSignedUploadUrl(userId: string, recordingId: string) {
    const path = this.createAudioUploadPath(userId, recordingId);
    if (!this.supabase) {
      // TODO: Replace this fallback with strict config validation before production.
      return {
        bucket: STORAGE_BUCKETS.AUDIO_PRIVATE,
        path,
        signedUrl: 'supabase-storage-not-configured',
      };
    }

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.AUDIO_PRIVATE)
      .createSignedUploadUrl(path);

    if (error) {
      throw error;
    }

    return {
      bucket: STORAGE_BUCKETS.AUDIO_PRIVATE,
      path,
      signedUrl: data.signedUrl,
      token: data.token,
    };
  }

  async createSignedDownloadUrl(path: string, expiresInSeconds = 60) {
    if (!this.supabase) {
      return {
        bucket: STORAGE_BUCKETS.AUDIO_PRIVATE,
        path,
        signedUrl: 'supabase-storage-not-configured',
        expiresInSeconds,
      };
    }

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.AUDIO_PRIVATE)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      throw error;
    }

    return {
      bucket: STORAGE_BUCKETS.AUDIO_PRIVATE,
      path,
      signedUrl: data.signedUrl,
      expiresInSeconds,
    };
  }
}
