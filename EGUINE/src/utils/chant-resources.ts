import type { RessourceChant } from '@/types';

export function isVoiceResource(resource: RessourceChant): boolean {
  return resource.type === 'audio'
    && (/^(soprano|alto|tenor|basse)$/i.test(resource.partie_vocale ?? '')
      || /\b(soprano|alto|tenor|ténor|basse)\b/i.test(`${resource.nom} ${resource.uri}`));
}
