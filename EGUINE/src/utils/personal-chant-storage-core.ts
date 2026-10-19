export type FileImportAdapter = {
  getInfo(uri: string): Promise<{ exists: boolean; size?: number }>;
  getFreeSpace(): Promise<number>;
  ensureDirectory(uri: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
};

export async function copyIntoPersistentStorage(
  adapter: FileImportAdapter,
  input: {
    sourceUri: string;
    documentDirectory: string;
    chantId: string;
    resourceId: string;
    fileName: string;
  },
): Promise<string> {
  if (!input.documentDirectory) {
    throw new Error('Le stockage local permanent est indisponible sur cet appareil.');
  }

  const source = await adapter.getInfo(input.sourceUri);
  if (!source.exists) {
    throw new Error(`Le fichier « ${input.fileName} » est introuvable.`);
  }
  if (typeof source.size === 'number' && source.size > await adapter.getFreeSpace()) {
    throw new Error(`L’espace disponible est insuffisant pour conserver « ${input.fileName} ».`);
  }

  const extension = input.fileName.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() ?? 'dat';
  const directory = `${input.documentDirectory}mes-chants/${input.chantId}/`;
  const destination = `${directory}${input.resourceId}.${extension}`;
  await adapter.ensureDirectory(directory);
  await adapter.copy(input.sourceUri, destination);
  return destination;
}
