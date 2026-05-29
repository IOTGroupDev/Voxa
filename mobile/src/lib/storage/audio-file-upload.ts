import * as FileSystem from 'expo-file-system/legacy';

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
  console.log('[upload] start', localUri.slice(-40));

  if (!target.signedUrl || target.signedUrl === 'supabase-storage-not-configured') {
    return { uploaded: false, skipped: true };
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64' as any,
    });
    const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const response = await fetch(target.signedUrl, {
      method: 'PUT',
      headers: { 'content-type': mimeType },
      body: binary,
    });

    console.log('[upload] status:', response.status);

    if (!response.ok) {
      const body = await response.text();
      console.error('[upload] error body:', body);
      throw new Error(`Audio upload failed with status ${response.status}`);
    }

    return { uploaded: true, skipped: false, status: response.status };
  } catch (error) {
    console.error('[upload] error:', error);
    throw error;
  }
}