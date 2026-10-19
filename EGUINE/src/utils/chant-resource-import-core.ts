export type ChantFileType = 'audio' | 'image' | 'pdf';

export type PickedChantFile = {
  name: string;
  mimeType?: string | null;
  size?: number | null;
  uri: string;
};

export const MAX_CHANT_RESOURCE_BYTES = 100 * 1024 * 1024;

const EXTENSIONS: Record<ChantFileType, Set<string>> = {
  audio: new Set(['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac']),
  image: new Set(['png', 'jpg', 'jpeg', 'webp']),
  pdf: new Set(['pdf']),
};

const MIME_PREFIXES: Record<ChantFileType, string[]> = {
  audio: ['audio/'],
  image: ['image/'],
  pdf: ['application/pdf'],
};

export function sanitizeResourceName(name: string): string {
  const leaf = name.replaceAll('\\', '/').split('/').at(-1) ?? '';
  return leaf.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 180);
}

export function validateChantFile(file: PickedChantFile, expectedType: ChantFileType): string | null {
  const name = sanitizeResourceName(file.name);
  if (!name) return 'Le fichier n’a pas de nom valide.';
  if (typeof file.size === 'number' && file.size > MAX_CHANT_RESOURCE_BYTES) {
    return 'Le fichier dépasse la limite de 100 Mo.';
  }
  if (typeof file.size === 'number' && file.size <= 0) {
    return 'Le fichier est vide.';
  }

  const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
  if (!EXTENSIONS[expectedType].has(extension)) {
    return expectedType === 'audio'
      ? 'Formats audio acceptés : MP3, M4A, WAV, AAC, OGG et FLAC.'
      : expectedType === 'image'
        ? 'Formats d’image acceptés : PNG, JPG et WebP.'
        : 'Format accepté : PDF.';
  }

  const mimeType = file.mimeType?.toLowerCase();
  if (mimeType && mimeType !== 'application/octet-stream'
    && !MIME_PREFIXES[expectedType].some((prefix) => mimeType.startsWith(prefix))) {
    return 'Le type déclaré par le fichier ne correspond pas à la ressource choisie.';
  }
  if (!file.uri) return 'Le sélecteur n’a fourni aucun chemin de fichier.';
  return null;
}