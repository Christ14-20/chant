export type DiscoveryGuide = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
};

export const WELCOME_STEPS: DiscoveryGuide[] = [
  {
    id: 'purpose',
    title: 'Bienvenue dans Cantique Guinée',
    description: 'Retrouvez les chants liturgiques de Guinée et leurs paroles pour prier et célébrer, où que vous soyez.',
    icon: 'church',
  },
  {
    id: 'explore',
    title: 'Explorez et retrouvez vos chants',
    description: 'Parcourez le catalogue, cherchez un titre ou des paroles, puis gardez vos chants préférés à portée de main.',
    icon: 'music-note-eighth',
  },
  {
    id: 'offline',
    title: 'Votre bibliothèque, même hors ligne',
    description: 'Le catalogue et ces conseils sont enregistrés sur votre appareil. Vous pouvez découvrir l’application sans connexion.',
    icon: 'cloud-off-outline',
  },
];

export const DISCOVERY_GUIDES: DiscoveryGuide[] = [
  { id: 'home', title: 'Votre accueil', description: 'Découvrez le chant du jour et les nouveautés. Ouvrez le catalogue ou utilisez les raccourcis pour retrouver votre activité.', icon: 'home-outline' },
  { id: 'catalog', title: 'Le catalogue des chants', description: 'Parcourez les chants, choisissez une catégorie ou un filtre, puis ouvrez un chant pour lire ses paroles.', icon: 'music-box-multiple' },
  { id: 'mass', title: 'Préparer une Messe', description: 'Choisissez un moment de la célébration pour y ajouter des chants et retrouver votre programme organisé.', icon: 'church' },
  { id: 'favorites', title: 'Vos favoris', description: 'Retrouvez ici les chants et prières enregistrés. Recherchez, filtrez ou triez votre sélection.', icon: 'heart-outline' },
  { id: 'settings', title: 'Personnalisez l’application', description: 'Choisissez la langue, le thème et la taille du texte. Depuis cette page, vous pourrez revoir la présentation et ce guide.', icon: 'cog-outline' },
  { id: 'login', title: 'Accéder à votre espace choriste', description: 'Le formulaire vérifie votre adresse e-mail et votre mot de passe, puis ouvre une session locale. La connexion en ligne et les boutons de réseaux sociaux ne sont pas configurés.', icon: 'account-key-outline' },
  { id: 'search', title: 'Rechercher dans l’application', description: 'Saisissez un titre ou un mot pour retrouver un chant dans la bibliothèque locale.', icon: 'magnify' },
  { id: 'chantSearch', title: 'Rechercher un chant', description: 'La recherche porte sur les titres, les auteurs et les paroles. Touchez un résultat pour ouvrir le chant.', icon: 'text-search' },
  { id: 'categories', title: 'Explorer par catégories', description: 'Choisissez un moment de Messe, une langue, un temps liturgique ou un thème, puis consultez les chants correspondants.', icon: 'filter-variant' },
  { id: 'chantDetail', title: 'La fiche du chant', description: 'Consultez les paroles et les informations du chant. Ajoutez-le aux favoris et utilisez les ressources disponibles sur sa fiche.', icon: 'music-note' },
  { id: 'chantResource', title: 'Ressource du chant', description: 'Consultez la ressource ouverte pour ce chant, puis revenez à sa fiche avec le bouton de retour.', icon: 'file-music-outline' },
  { id: 'chantManagement', title: 'Gérer ce chant', description: 'Modifiez les informations et les ressources de votre chant personnel, ou consultez les options disponibles pour cette fiche.', icon: 'playlist-edit' },
  { id: 'newChant', title: 'Ajouter un chant', description: 'Saisissez le titre et les paroles, puis complétez les informations utiles avant d’enregistrer votre chant.', icon: 'music-note-plus' },
  { id: 'personalSongs', title: 'Vos chants personnels', description: 'Retrouvez les chants que vous avez ajoutés et ouvrez-en un pour consulter ses paroles ou le modifier.', icon: 'music-box-multiple-outline' },
  { id: 'personalSongDetail', title: 'Votre chant personnel', description: 'Consultez les paroles et les détails de ce chant, puis accédez à sa gestion si vous souhaitez le modifier.', icon: 'music-box-outline' },
  { id: 'newPersonalSong', title: 'Créer un chant personnel', description: 'Ajoutez vos propres paroles et informations. Votre chant sera conservé localement sur cet appareil.', icon: 'playlist-plus' },
  { id: 'prayers', title: 'Vos prières', description: 'Parcourez les prières disponibles et ouvrez-en une pour lire son texte ou l’ajouter à vos favoris.', icon: 'hands-pray' },
  { id: 'prayerDetail', title: 'Lire une prière', description: 'Prenez le temps de lire le texte et ajoutez cette prière à vos favoris pour la retrouver facilement.', icon: 'book-open-page-variant-outline' },
  { id: 'newPrayer', title: 'Créer une prière', description: 'Rédigez le titre et le texte de votre prière, puis enregistrez-la dans votre espace.', icon: 'note-plus-outline' },
  { id: 'saint', title: 'Découvrir un saint', description: 'Parcourez les informations et la fête associées à ce saint.', icon: 'account-heart-outline' },
  { id: 'history', title: 'Votre historique', description: 'Retrouvez les écrans et contenus consultés récemment pour reprendre facilement votre activité.', icon: 'history' },
  { id: 'calendar', title: 'Votre agenda', description: 'Consultez les événements et les dates liturgiques affichés dans votre agenda.', icon: 'calendar-month-outline' },
  { id: 'liturgy', title: 'Liturgie', description: 'Cette page est prévue pour les lectures, les saints et les horaires de messe. Aucun contenu liturgique n’est enregistré pour le moment.', icon: 'book-open-page-variant-outline' },
  { id: 'help', title: 'Aide et FAQ', description: 'Consultez les réponses aux questions fréquentes sur les favoris, les chants et l’utilisation hors ligne.', icon: 'help-circle-outline' },
  { id: 'notifications', title: 'Vos notifications', description: 'Consultez les informations et alertes présentées dans l’application.', icon: 'bell-outline' },
  { id: 'profile', title: 'Votre profil', description: 'Consultez votre espace et les options liées à votre profil.', icon: 'account-outline' },
  { id: 'miniPlayer', title: 'Le mini-lecteur', description: 'Utilisez lecture ou pause pour contrôler le chant en cours. Le bouton de fermeture retire le chant du mini-lecteur.', icon: 'play-circle-outline' },
];

export function normalizeDiscoveryPath(pathname: string): string {
  const withoutQuery = pathname.split('?')[0] ?? '';
  const withoutTabGroup = withoutQuery.replace(/^\/\(tabs\)/, '');
  const normalized = withoutTabGroup.replace(/\/index$/, '').replace(/\/+$/, '');
  return normalized || '/';
}

export function getDiscoveryGuide(pathname: string): DiscoveryGuide | undefined {
  const path = normalizeDiscoveryPath(pathname);
  if (path === '/home' || path === '/') return DISCOVERY_GUIDES[0];
  if (path === '/chants') return DISCOVERY_GUIDES.find((guide) => guide.id === 'catalog');
  if (path === '/messe') return DISCOVERY_GUIDES.find((guide) => guide.id === 'mass');
  if (path === '/favoris') return DISCOVERY_GUIDES.find((guide) => guide.id === 'favorites');
  if (path === '/parametres') return DISCOVERY_GUIDES.find((guide) => guide.id === 'settings');
  if (path === '/connexion') return DISCOVERY_GUIDES.find((guide) => guide.id === 'login');
  if (path === '/search') return DISCOVERY_GUIDES.find((guide) => guide.id === 'search');
  if (path === '/chant/search') return DISCOVERY_GUIDES.find((guide) => guide.id === 'chantSearch');
  if (path.startsWith('/chant/category/')) return DISCOVERY_GUIDES.find((guide) => guide.id === 'categories');
  if (path === '/chant/nouveau') return DISCOVERY_GUIDES.find((guide) => guide.id === 'newChant');
  if (/^\/chant\/[^/]+\/gestion$/.test(path)) return DISCOVERY_GUIDES.find((guide) => guide.id === 'chantManagement');
  if (/^\/chant\/[^/]+\/[^/]+$/.test(path)) return DISCOVERY_GUIDES.find((guide) => guide.id === 'chantResource');
  if (/^\/chant\/[^/]+$/.test(path)) return DISCOVERY_GUIDES.find((guide) => guide.id === 'chantDetail');
  if (path === '/mes-chants') return DISCOVERY_GUIDES.find((guide) => guide.id === 'personalSongs');
  if (path === '/mes-chants/nouveau') return DISCOVERY_GUIDES.find((guide) => guide.id === 'newPersonalSong');
  if (/^\/mes-chants\/[^/]+$/.test(path)) return DISCOVERY_GUIDES.find((guide) => guide.id === 'personalSongDetail');
  if (path === '/lecture') return DISCOVERY_GUIDES.find((guide) => guide.id === 'liturgy');
  if (path === '/prieres') return DISCOVERY_GUIDES.find((guide) => guide.id === 'prayers');
  if (path === '/priere/nouvelle') return DISCOVERY_GUIDES.find((guide) => guide.id === 'newPrayer');
  if (/^\/priere\/[^/]+$/.test(path)) return DISCOVERY_GUIDES.find((guide) => guide.id === 'prayerDetail');
  if (/^\/saint\/[^/]+$/.test(path)) return DISCOVERY_GUIDES.find((guide) => guide.id === 'saint');
  if (path === '/historique') return DISCOVERY_GUIDES.find((guide) => guide.id === 'history');
  if (path === '/agenda') return DISCOVERY_GUIDES.find((guide) => guide.id === 'calendar');
  if (path === '/aide') return DISCOVERY_GUIDES.find((guide) => guide.id === 'help');
  if (path === '/notifications') return DISCOVERY_GUIDES.find((guide) => guide.id === 'notifications');
  if (path === '/profile') return DISCOVERY_GUIDES.find((guide) => guide.id === 'profile');
  return undefined;
}

export function getDiscoveryGuideById(id: string): DiscoveryGuide | undefined {
  return DISCOVERY_GUIDES.find((guide) => guide.id === id);
}
