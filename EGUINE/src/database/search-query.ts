export type ChantSearchOptions = {
  enabled?: boolean;
  query?: string;
  language?: string | null;
  languages?: string[];
  requiredLanguage?: string | null;
  category?: string | null;
  categories?: string[];
  requiredCategories?: string[];
  excludeIds?: string[];
  massPartId?: string;
  momentOrCategory?: string;
  liturgicalSeason?: string | null;
  liturgicalSeasons?: string[];
  mood?: string | null;
  moodOnly?: boolean;
  massOnly?: boolean;
  nonFrenchOnly?: boolean;
  audioOnly?: boolean;
  lyricsOnly?: boolean;
  partitionOnly?: boolean;
  personalOnly?: boolean;
  favoritesOnly?: boolean;
  favoriteUserId?: string;
  preferredLanguage?: string;
  preferredCategory?: string;
  limit?: number;
  offset?: number;
};

export type ChantSearchQueries = {
  selectSql: string;
  countSql: string;
  selectParams: (string | number)[];
  countParams: (string | number)[];
};

function ftsQuery(value: string): string {
  return (value.match(/[\p{L}\p{N}_]+/gu) ?? [])
    .map((part) => `"${part.replaceAll('"', '""')}"*`)
    .join(' AND ');
}

function buildWhere(options: ChantSearchOptions, ftsAvailable: boolean) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  const query = options.query?.trim();
  if (query) {
    const match = ftsQuery(query);
    if (ftsAvailable && match) {
      clauses.push(`c.rowid IN (
        SELECT rowid FROM chants_fts WHERE chants_fts MATCH ?
      )`);
      params.push(match);
    } else {
      const value = `%${query}%`;
      clauses.push('(c.title LIKE ? COLLATE NOCASE OR c.lyrics LIKE ? COLLATE NOCASE OR c.author LIKE ? COLLATE NOCASE OR c.composer LIKE ? COLLATE NOCASE)');
      params.push(value, value, value, value);
    }
  }
  if (options.language) {
    clauses.push('c.language = ?');
    params.push(options.language);
  }
  if (options.languages?.length) {
    clauses.push(`c.language IN (${options.languages.map(() => '?').join(', ')})`);
    params.push(...options.languages);
  }
  if (options.requiredLanguage) {
    clauses.push('c.language = ?');
    params.push(options.requiredLanguage);
  }
  if (options.category) {
    clauses.push('EXISTS (SELECT 1 FROM chant_categories cc WHERE cc.chant_id = c.id AND cc.category_id = ?)');
    params.push(options.category);
  }
  if (options.categories?.length) {
    clauses.push(`EXISTS (SELECT 1 FROM chant_categories cc WHERE cc.chant_id = c.id AND cc.category_id IN (${options.categories.map(() => '?').join(', ')}))`);
    params.push(...options.categories);
  }
  for (const categoryId of options.requiredCategories ?? []) {
    clauses.push('EXISTS (SELECT 1 FROM chant_categories cc WHERE cc.chant_id = c.id AND cc.category_id = ?)');
    params.push(categoryId);
  }
  if (options.excludeIds?.length) {
    clauses.push(`c.id NOT IN (${options.excludeIds.map(() => '?').join(', ')})`);
    params.push(...options.excludeIds);
  }
  if (options.liturgicalSeason) {
    clauses.push('c.liturgical_season = ?');
    params.push(options.liturgicalSeason);
  }
  if (options.liturgicalSeasons?.length) {
    clauses.push(`c.liturgical_season IN (${options.liturgicalSeasons.map(() => '?').join(', ')})`);
    params.push(...options.liturgicalSeasons);
  }
  if (options.mood) {
    clauses.push('(c.theme = ? OR c.primary_category_id = ? OR EXISTS (SELECT 1 FROM chant_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.chant_id = c.id AND t.type IN (?, ?) AND t.name = ?))');
    params.push(options.mood, options.mood, 'humeur', 'theme', options.mood);
  }
  if (options.moodOnly) {
    clauses.push("(c.theme IS NOT NULL OR EXISTS (SELECT 1 FROM chant_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.chant_id = c.id AND t.type = 'humeur'))");
  }
  if (options.nonFrenchOnly) clauses.push("c.language <> 'fr'");
  if (options.massOnly) {
    clauses.push(`(
      c.mass_moment IS NOT NULL
      OR EXISTS (SELECT 1 FROM chant_mass_parts cmp WHERE cmp.chant_id = c.id)
      OR c.primary_category_id IN (
        'entree', 'kyrie', 'gloria', 'psaume', 'acclamation', 'credo',
        'priere_universelle', 'offertoire', 'sanctus', 'agnus_dei',
        'communion', 'action_grace', 'chant_final'
      )
    )`);
  }
  if (options.massPartId) {
    clauses.push('EXISTS (SELECT 1 FROM chant_mass_parts cmp WHERE cmp.chant_id = c.id AND cmp.mass_part_id = ?)');
    params.push(options.massPartId);
  }
  if (options.momentOrCategory) {
    clauses.push('(c.mass_moment = ? OR EXISTS (SELECT 1 FROM chant_mass_parts cmp WHERE cmp.chant_id = c.id AND cmp.mass_part_id = ?) OR EXISTS (SELECT 1 FROM chant_categories cc WHERE cc.chant_id = c.id AND cc.category_id = ?))');
    params.push(options.momentOrCategory, options.momentOrCategory, options.momentOrCategory);
  }
  if (options.audioOnly) {
    clauses.push('(c.audio_url IS NOT NULL OR EXISTS (SELECT 1 FROM chant_resources cr WHERE cr.chant_id = c.id AND cr.resource_type = ?))');
    params.push('audio');
  }
  if (options.lyricsOnly) clauses.push("length(trim(c.lyrics)) > 0");
  if (options.partitionOnly) {
    clauses.push('(c.sheet_url IS NOT NULL OR EXISTS (SELECT 1 FROM chant_resources cr WHERE cr.chant_id = c.id AND cr.resource_type IN (?, ?)))');
    params.push('image', 'pdf');
  }
  if (options.personalOnly) clauses.push('c.personal = 1');
  if (options.favoritesOnly) {
    clauses.push('EXISTS (SELECT 1 FROM favorites f WHERE f.chant_id = c.id AND f.user_id = ?)');
    params.push(options.favoriteUserId ?? 'local');
  }
  return { clauses, params };
}

export function buildChantSearchQueries(
  options: ChantSearchOptions,
  ftsAvailable: boolean,
): ChantSearchQueries {
  const { clauses, params } = buildWhere(options, ftsAvailable);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 30)));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const orderParams: string[] = [];
  const orderParts: string[] = [];
  if (options.preferredCategory) {
    orderParts.push('(EXISTS (SELECT 1 FROM chant_categories cc WHERE cc.chant_id = c.id AND cc.category_id = ?)) DESC');
    orderParams.push(options.preferredCategory);
  }
  if (options.preferredLanguage) {
    orderParts.push('(c.language = ?) DESC');
    orderParams.push(options.preferredLanguage);
  }
  orderParts.push('c.title COLLATE NOCASE', 'c.id');
  const ordering = `ORDER BY ${orderParts.join(', ')}`;
  return {
    selectSql: `SELECT c.* FROM chants c ${where} ${ordering} LIMIT ? OFFSET ?`,
    countSql: `SELECT count(*) AS total FROM chants c ${where}`,
    selectParams: [...params, ...orderParams, limit, offset],
    countParams: params,
  };
}
