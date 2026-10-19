import * as FileSystem from 'expo-file-system/legacy';
import type { RessourceChant } from '@/types';
import { copyIntoPersistentStorage } from '@/utils/personal-chant-storage-core';

export async function savePersonalChantFile(
  sourceUri: string,
  chantId: string,
  resourceId: string,
  fileName: string,
): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  return copyIntoPersistentStorage(
    {
      getInfo: async (uri) => {
        const info = await FileSystem.getInfoAsync(uri);
        return { exists: info.exists, size: info.exists ? info.size : undefined };
      },
      getFreeSpace: () => FileSystem.getFreeDiskStorageAsync(),
      ensureDirectory: (uri) => FileSystem.makeDirectoryAsync(uri, { intermediates: true }),
      copy: (from, to) => FileSystem.copyAsync({ from, to }),
    },
    { sourceUri, documentDirectory: documentDirectory ?? '', chantId, resourceId, fileName },
  );
}

export const saveChantResourceFile = savePersonalChantFile;

export async function deletePersonalChantFiles(resources: RessourceChant[]): Promise<void> {
  for (const resource of resources) {
    const info = await FileSystem.getInfoAsync(resource.uri);
    if (info.exists) {
      await FileSystem.deleteAsync(resource.uri);
    }
  }
}
