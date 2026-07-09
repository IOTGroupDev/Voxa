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
  if (!target.signedUrl) {
    return { uploaded: false, skipped: true };
  }

  const response = await FileSystem.uploadAsync(target.signedUrl, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'content-type': mimeType },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Audio upload failed with status ${response.status}`);
  }

  return { uploaded: true, skipped: false, status: response.status };
}
