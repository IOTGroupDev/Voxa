import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ExportFormat, ExportResponse } from '../api/voxa-api';

export async function shareExport(load: (format: ExportFormat) => Promise<ExportResponse>) {
  const result = await load('markdown');
  await Share.share({ message: result.content });
}

export async function copyExport(load: (format: ExportFormat) => Promise<ExportResponse>, format: ExportFormat) {
  const result = await load(format);
  await Clipboard.setStringAsync(result.content);
  return result;
}
