import { File, UploadType } from 'expo-file-system';

export interface SignedUploadTarget {
  signedUrl: string;
  path?: string;
}

export interface AudioFileUploadResult {
  uploaded: boolean;
  skipped: boolean;
  status?: number;
}

export async function uploadAudioFileToSignedUrl(
  localUri: string,
  target: SignedUploadTarget,
  mimeType = 'audio/mp4',
): Promise<AudioFileUploadResult> {
  if (!target.signedUrl || target.signedUrl === 'supabase-storage-not-configured') {
    return { uploaded: false, skipped: true };
  }

  const file = new File(localUri);
  const result = await file.upload(target.signedUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType,
    headers: {
      'content-type': mimeType,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Audio upload failed with status ${result.status}.`);
  }

  return {
    uploaded: true,
    skipped: false,
    status: result.status,
  };
}
