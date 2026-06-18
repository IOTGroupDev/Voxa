import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKETS } from '@voxa/shared';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient | null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
    this.logger.log(`Supabase storage ${this.supabase ? 'configured' : 'not configured'}`);
  }

  createAudioUploadPath(userId: string, recordingId: string): string {
    return `${userId}/recordings/${recordingId}.m4a`;
  }

  async createSignedUploadUrl(userId: string, recordingId: string) {
    const path = this.createAudioUploadPath(userId, recordingId);
    if (!this.supabase) {
      throw new ServiceUnavailableException('Supabase storage is not configured.');
    }

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.AUDIO_PRIVATE)
      .createSignedUploadUrl(path);

    if (error) {
      this.logger.error(`Failed to create signed upload URL path=${path}: ${error.message}`);
      throw error;
    }
    this.logger.log(`Signed upload URL created bucket=${STORAGE_BUCKETS.AUDIO_PRIVATE} path=${path}`);

    return {
      bucket: STORAGE_BUCKETS.AUDIO_PRIVATE,
      path,
      signedUrl: data.signedUrl,
      token: data.token,
    };
  }

  async createSignedDownloadUrl(path: string, expiresInSeconds = 60) {
    if (!this.supabase) {
      throw new ServiceUnavailableException('Supabase storage is not configured.');
    }

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.AUDIO_PRIVATE)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      this.logger.error(`Failed to create signed download URL path=${path}: ${error.message}`);
      throw error;
    }
    this.logger.log(`Signed download URL created bucket=${STORAGE_BUCKETS.AUDIO_PRIVATE} path=${path}`);

    return {
      bucket: STORAGE_BUCKETS.AUDIO_PRIVATE,
      path,
      signedUrl: data.signedUrl,
      expiresInSeconds,
    };
  }

  async deleteAudioObject(path: string) {
    if (!this.supabase) {
      throw new ServiceUnavailableException('Supabase storage is not configured.');
    }

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.AUDIO_PRIVATE)
      .remove([path]);

    if (error) {
      this.logger.error(`Failed to delete audio object bucket=${STORAGE_BUCKETS.AUDIO_PRIVATE} path=${path}: ${error.message}`);
      throw error;
    }

    if (data.length === 0) {
      this.logger.warn(`Audio object was not found during delete bucket=${STORAGE_BUCKETS.AUDIO_PRIVATE} path=${path}`);
    } else {
      this.logger.log(`Audio object deleted bucket=${STORAGE_BUCKETS.AUDIO_PRIVATE} path=${path}`);
    }

    return { bucket: STORAGE_BUCKETS.AUDIO_PRIVATE, path, deleted: data };
  }
}
