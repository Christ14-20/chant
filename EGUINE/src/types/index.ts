export type Langue =
  | 'fr'
  | 'la'
  | 'es'
  | 'soussou'
  | 'poular'
  | 'malinke'
  | 'kissi'
  | 'guerze'
  | 'toma'
  | 'kpele'
  | 'baga'
  | 'loma'
  | 'mano'
  | 'kono'
  | 'en';

export type Categorie =
  | 'entree'
  | 'kyrie'
  | 'gloria'
  | 'psaume'
  | 'acclamation'
  | 'credo'
  | 'priere_universelle'
  | 'offertoire'
  | 'sanctus'
  | 'agnus_dei'
  | 'communion'
  | 'action_grace'
  | 'chant_final'
  | 'louange'
  | 'adoration'
  | 'penitence'
  | 'marial'
  | 'funerailles'
  | 'autre';

export type TempsLiturgique =
  | 'toute_annee'
  | 'avent'
  | 'noel'
  | 'careme'
  | 'triduum_pascal'
  | 'temps_pascal'
  | 'temps_ordinaire';

export type MomentMesse =
  | 'entree'
  | 'liturgie_parole'
  | 'liturgie_eucharistique'
  | 'communion'
  | 'envoi';

export type Theme =
  | 'louange'
  | 'action_grace'
  | 'penitence'
  | 'espoir'
  | 'confiance'
  | 'marie'
  | 'eucharistie'
  | 'croix'
  | 'resurrection'
  | 'esprit_saint'
  | 'autre';

export type Niveau = 'facile' | 'moyen' | 'difficile';
export type StatutJuridique =
  | 'domaine_public'
  | 'creation_originale'
  | 'autorisation_obtenue'
  | 'autorisation_en_attente'
  | 'contenu_restreint';

export type VoixChorale = 'soprano' | 'alto' | 'tenor' | 'basse';
export type TagType = 'liturgie' | 'temps' | 'theme' | 'humeur' | 'langue' | 'style';
export type Role = 'fidelle' | 'choriste' | 'paroisse' | 'admin';

export interface Tag {
  id: string;
  nom: string;
  type: TagType;
  couleur?: string;
}

export interface Variante {
  id: string;
  chant_id: string;
  nom_variante: string;
  tonalite?: string;
  tempo?: string;
  audio_url?: string;
  partition_url?: string;
  description?: string;
}

export type TypeRessourceChant = 'audio' | 'image' | 'pdf';
export type RoleAudioChant = 'original' | 'accompagnement' | 'choeur' | 'voix' | 'autre';
export type PartieVocale = 'soprano' | 'alto' | 'tenor' | 'basse' | 'voix_principale' | 'personnalisee';
export type TypeSectionParoles = 'couplet' | 'refrain' | 'pont' | 'intro' | 'outro' | 'autre';

export interface SectionParoles {
  id: string;
  type: TypeSectionParoles;
  titre: string;
  texte: string;
}

export interface RessourceChant {
  id: string;
  type: TypeRessourceChant;
  uri: string;
  nom: string;
  mime_type?: string;
  taille_octets?: number;
  role_audio?: RoleAudioChant;
  partie_vocale?: PartieVocale | string;
  description?: string;
  version?: string;
  tonalite?: string;
  created_at: string;
  availability?: 'importing' | 'available' | 'missing' | 'failed';
  sync_state?: 'local_only' | 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface Chant {
  id: string;
  titre: string;
  paroles: string;
  sections_paroles?: SectionParoles[];
  accords?: string;
  traduction?: string;
  langue: Langue;
  categorie: Categorie;
  categories?: Categorie[];
  temps_liturgique?: TempsLiturgique;
  moment_messe?: MomentMesse;
  theme?: Theme;
  tonalite?: string;
  tempo?: string;
  auteur?: string;
  compositeur?: string;
  niveau_difficulte?: Niveau;
  audio_url?: string;
  partition_url?: string;
  video_url?: string;
  statut_juridique: StatutJuridique;
  preuve_autorisation?: string;
  source?: string;
  publie: boolean;
  nombre_vues: number;
  nombre_favoris: number;
  vues?: number;
  downloaded?: boolean;
  celebration?: string;
  occasion?: string;
  date_creation?: string;
  tags: Tag[];
  variantes: Variante[];
  ressources?: RessourceChant[];
  est_personnel?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  chant_id: string;
  created_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  nom: string;
  description?: string;
  chants: Chant[];
  created_at: string;
  updated_at: string;
}

export interface Parish {
  id: string;
  nom: string;
  diocese: string;
  ville: string;
  region: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  horaires_messe?: string;
  coordinates?: { lat: number; lng: number };
  verified: boolean;
  qr_code?: string;
  created_at: string;
}

export interface MesseItem {
  id: string;
  chant_id: string;
  ordre: number;
  moment: MomentMesse;
}

export interface Messe {
  id: string;
  date: string;
  titre?: string;
  temps_liturgique?: string;
  paroisse_id?: string;
  items: MesseItem[];
  created_at: string;
}

export interface Celebration {
  id: string;
  title: string;
  date: string;
  temps_liturgique: TempsLiturgique;
  selectedChants: Partial<Record<string, string[]>>;
  customMoments?: { id: string; title: string }[];
  slotOrder?: string[];
  created_at?: string;
  updated_at?: string;
  status?: 'draft' | 'completed';
}

export interface Intention {
  id: string;
  user_id: string;
  contenu: string;
  nombre_prieres: number;
  cloturee: boolean;
  created_at: string;
  expires_at: string;
}

export interface Priere {
  id: string;
  titre: string;
  contenu: string;
  langue: Langue;
  categorie: string;
  moment_jour?: string;
  theme?: string;
  publie: boolean;
  created_at: string;
}

export interface Lecture {
  id: string;
  date: string;
  reference?: string;
  evangile: string;
  premiere?: string;
  seconde?: string;
  psaume?: string;
  acclamation?: string;
  created_at: string;
}

export interface Saint {
  id: string;
  nom: string;
  date_fete: string;
  biographie?: string;
  pays?: string;
  diocèse?: string;
  image_url?: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: Role;
  language_pref: Langue;
  parish_id?: string;
  profileImage?: string | null;
  created_at: string;
}

export type OfflineStatus = 'connecte' | 'sync_cours' | 'hors_ligne' | 'hors_ligne_vide';

export interface Priere {
  id: string;
  titre: string;
  contenu: string;
  langue: Langue;
  categorie: string;
  sous_categorie?: string;
  moment_jour?: string;
  moment?: string;
  theme?: string;
  tags?: string[];
  vues?: number;
  date_creation?: string;
  publie: boolean;
  created_at: string;
}
