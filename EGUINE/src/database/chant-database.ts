import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import type { Celebration, Chant, RessourceChant } from '@/types';
import { initialChants } from '@/data/initialChants';
import {
  CHANT_CATEGORIES,
  DATABASE_MIGRATIONS,
  MASS_PARTS,
} from '@/database/schema';
import {
  buildChantSearchQueries,
  type ChantSearchOptions,
} from '@/database/search-query';

const DATABASE_NAME = 'eguine.db';
const DEFAULT_USER_ID = 'local';

type ChantRow = {
  id: string;
  title: string;
  lyrics: string;
  translation: string | null;
  language: string;
  primary_category_id: string;
  liturgical_season: string | null;
  mass_moment: string | null;
  theme: string | null;
  key_signature: string | null;
  tempo: string | null;
  author: string | null;
  composer: string | null;
  difficulty: string | null;
  audio_url: string | null;
  sheet_url: string | null;
  video_url: string | null;
  legal_status: string;
  authorization_proof: string | null;
  source: string | null;
  published: number;
  view_count: number;
  favorite_count: number;
  personal: number;
  created_at: string;
  updated_at: string;
  metadata_json: string;
};

type RelatedRows = {
  tags: Map<string, Chant['tags']>;
  variants: Map<string, NonNullable<Chant['variantes']>>;
  resources: Map<string, RessourceChant[]>;
  categories: Map<string, string[]>;
};

export type { ChantSearchOptions } from '@/database/search-query';

export type ChantPage = {
  items: Chant[];
  total: number;
  hasMore: boolean;
};

export type ChantHistoryEntry = {
  chantId: string;
  lastViewedAt: string;
  viewCount: number;
  lastListenedAt: string | null;
  listenCount: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let ftsAvailable = false;
let writeQueue: Promise<void> = Promise.resolve();

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function withWriteTransaction<T>(
  db: SQLite.SQLiteDatabase,
  operation: () => Promise<T>,
): Promise<T> {
  return serializeWrite(async () => {
    let result!: T;
    await db.withTransactionAsync(async () => {
      result = await operation();
    });
    return result;
  });
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  for (const migration of DATABASE_MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    if (migration.version === 2) {
      try {
        await db.execAsync(migration.sql);
        ftsAvailable = true;
      } catch (error) {
        ftsAvailable = false;
        console.warn('FTS5 indisponible dans ce moteur SQLite ; la recherche LIKE indexée sera utilisée.', error);
      }
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    } else {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
    }
    currentVersion = migration.version;
  }

  if (currentVersion >= 2 && !ftsAvailable) {
    const ftsTable = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'chants_fts'",
    );
    if (ftsTable) {
      ftsAvailable = true;
    } else {
      const ftsMigration = DATABASE_MIGRATIONS.find((migration) => migration.version === 2);
      if (ftsMigration) {
        try {
          await db.execAsync(ftsMigration.sql);
          ftsAvailable = true;
        } catch (error) {
          console.warn('La recherche plein texte FTS5 reste indisponible.', error);
        }
      }
    }
  }
}

export async function getChantDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await runMigrations(db);
      return db;
    })().catch((error: unknown) => {
      databasePromise = null;
      throw new Error('Impossible d’ouvrir la bibliothèque SQLite locale.', { cause: error });
    });
  }
  return databasePromise;
}

function optional(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Métadonnées de chant invalides dans SQLite.', error);
    return fallback;
  }
}

function isLocalFileUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

async function insertResource(
  db: SQLite.SQLiteDatabase,
  chantId: string,
  resource: RessourceChant,
  sortOrder: number,
): Promise<void> {
  const now = new Date().toISOString();
  let availability: 'available' | 'missing' = 'missing';
  if (isLocalFileUri(resource.uri)) {
    try {
      const info = await FileSystem.getInfoAsync(resource.uri);
      availability = info.exists ? 'available' : 'missing';
    } catch (error) {
      console.warn(`Impossible de vérifier le fichier local ${resource.nom}.`, error);
    }
  }
  await db.runAsync(
    `INSERT INTO local_files
      (uri, file_type, name, mime_type, size_bytes, availability, sync_state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'local_only', ?, ?)
     ON CONFLICT(uri) DO UPDATE SET
       file_type = excluded.file_type,
       name = excluded.name,
       mime_type = excluded.mime_type,
       size_bytes = excluded.size_bytes,
       availability = excluded.availability,
       updated_at = excluded.updated_at`,
    resource.uri,
    resource.type,
    resource.nom,
    optional(resource.mime_type),
    resource.taille_octets ?? null,
    availability,
    resource.created_at,
    now,
  );
  await db.runAsync(
    `INSERT INTO chant_resources (id, chant_id, file_uri, resource_type, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       chant_id = excluded.chant_id,
       file_uri = excluded.file_uri,
       resource_type = excluded.resource_type,
       sort_order = excluded.sort_order`,
    resource.id,
    chantId,
    resource.uri,
    resource.type,
    sortOrder,
    resource.created_at,
  );
  await db.runAsync(
    'UPDATE chant_resources SET metadata_json = ? WHERE id = ? AND chant_id = ?',
    toJson({
      role_audio: resource.role_audio,
      partie_vocale: resource.partie_vocale,
      description: resource.description,
      version: resource.version,
      tonalite: resource.tonalite,
    }),
    resource.id,
    chantId,
  );
}

async function writeChant(
  db: SQLite.SQLiteDatabase,
  chant: Chant,
  onConflict: 'ignore' | 'replace',
): Promise<void> {
  const conflict = onConflict === 'replace'
    ? `ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        lyrics = excluded.lyrics,
        translation = excluded.translation,
        language = excluded.language,
        primary_category_id = excluded.primary_category_id,
        liturgical_season = excluded.liturgical_season,
        mass_moment = excluded.mass_moment,
        theme = excluded.theme,
        key_signature = excluded.key_signature,
        tempo = excluded.tempo,
        author = excluded.author,
        composer = excluded.composer,
        difficulty = excluded.difficulty,
        audio_url = excluded.audio_url,
        sheet_url = excluded.sheet_url,
        video_url = excluded.video_url,
        legal_status = excluded.legal_status,
        authorization_proof = excluded.authorization_proof,
        source = excluded.source,
        published = excluded.published,
        personal = excluded.personal,
        updated_at = excluded.updated_at,
        metadata_json = excluded.metadata_json`
    : 'ON CONFLICT(id) DO NOTHING';
  const metadata = { ...chant } as Record<string, unknown>;
  delete metadata.tags;
  delete metadata.variantes;
  delete metadata.ressources;

  const saved = await db.runAsync(
    `INSERT INTO chants (
       id, title, lyrics, translation, language, primary_category_id, liturgical_season,
       mass_moment, theme, key_signature, tempo, author, composer, difficulty, audio_url,
       sheet_url, video_url, legal_status, authorization_proof, source, published,
       view_count, favorite_count, personal, created_at, updated_at, metadata_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ${conflict}`,
    chant.id,
    chant.titre,
    chant.paroles,
    optional(chant.traduction),
    chant.langue,
    chant.categorie,
    optional(chant.temps_liturgique),
    optional(chant.moment_messe),
    optional(chant.theme),
    optional(chant.tonalite),
    optional(chant.tempo),
    optional(chant.auteur),
    optional(chant.compositeur),
    optional(chant.niveau_difficulte),
    optional(chant.audio_url),
    optional(chant.partition_url),
    optional(chant.video_url),
    chant.statut_juridique,
    optional(chant.preuve_autorisation),
    optional(chant.source),
    chant.publie ? 1 : 0,
    chant.vues ?? chant.nombre_vues,
    chant.nombre_favoris,
    chant.est_personnel ? 1 : 0,
    chant.created_at,
    chant.updated_at,
    toJson(metadata),
  );

  if (onConflict === 'ignore' && saved.changes === 0) return;
  const exists = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM chants WHERE id = ?',
    chant.id,
  );
  if (!exists) return;

  await db.runAsync('INSERT OR IGNORE INTO categories (id, label) VALUES (?, ?)', chant.categorie, chant.categorie.replaceAll('_', ' '));
  if (onConflict === 'replace') {
    await db.runAsync('DELETE FROM chant_categories WHERE chant_id = ?', chant.id);
    await db.runAsync('DELETE FROM chant_tags WHERE chant_id = ?', chant.id);
    await db.runAsync('DELETE FROM chant_variants WHERE chant_id = ?', chant.id);
    await db.runAsync('DELETE FROM chant_resources WHERE chant_id = ?', chant.id);
    await db.runAsync('DELETE FROM personal_library WHERE chant_id = ?', chant.id);
  }

  const categoryIds = [...new Set([chant.categorie, ...((chant as Chant & { categories?: string[] }).categories ?? [])])];
  for (const categoryId of categoryIds) {
    const label = CHANT_CATEGORIES.find(([id]) => id === categoryId)?.[1] ?? categoryId.replaceAll('_', ' ');
    await db.runAsync('INSERT OR IGNORE INTO categories (id, label) VALUES (?, ?)', categoryId, label);
    await db.runAsync(
      'INSERT OR IGNORE INTO chant_categories (chant_id, category_id) VALUES (?, ?)',
      chant.id,
      categoryId,
    );
  }

  for (const tag of chant.tags) {
    await db.runAsync(
      `INSERT INTO tags (id, name, type, color) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, type = excluded.type, color = excluded.color`,
      tag.id,
      tag.nom,
      tag.type,
      optional(tag.couleur),
    );
    await db.runAsync('INSERT OR IGNORE INTO chant_tags (chant_id, tag_id) VALUES (?, ?)', chant.id, tag.id);
  }

  for (const variant of chant.variantes) {
    await db.runAsync(
      `INSERT INTO chant_variants
        (id, chant_id, name, key_signature, tempo, audio_url, sheet_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         chant_id = excluded.chant_id, name = excluded.name,
         key_signature = excluded.key_signature, tempo = excluded.tempo,
         audio_url = excluded.audio_url, sheet_url = excluded.sheet_url,
         description = excluded.description`,
      variant.id,
      chant.id,
      variant.nom_variante,
      optional(variant.tonalite),
      optional(variant.tempo),
      optional(variant.audio_url),
      optional(variant.partition_url),
      optional(variant.description),
    );
  }

  if (chant.moment_messe) {
    await db.runAsync(
      `INSERT OR IGNORE INTO mass_parts (id, label, section, sort_order)
       VALUES (?, ?, 'Liturgie', 100)`,
      chant.moment_messe,
      chant.moment_messe.replaceAll('_', ' '),
    );
    await db.runAsync(
      'INSERT OR IGNORE INTO chant_mass_parts (chant_id, mass_part_id) VALUES (?, ?)',
      chant.id,
      chant.moment_messe,
    );
  }
  for (const [sortOrder, resource] of (chant.ressources ?? []).entries()) {
    await insertResource(db, chant.id, resource, sortOrder);
  }
  if (chant.est_personnel) {
    await db.runAsync(
      `INSERT INTO personal_library (user_id, chant_id, created_at, sync_state)
       VALUES (?, ?, ?, 'local_only')
       ON CONFLICT(user_id, chant_id) DO NOTHING`,
      DEFAULT_USER_ID,
      chant.id,
      chant.created_at,
    );
  }
}

async function loadRelatedRows(db: SQLite.SQLiteDatabase, rows: ChantRow[]): Promise<RelatedRows> {
  const related: RelatedRows = {
    tags: new Map(),
    variants: new Map(),
    resources: new Map(),
    categories: new Map(),
  };
  if (rows.length === 0) return related;
  const placeholders = rows.map(() => '?').join(', ');
  const ids = rows.map((row) => row.id);

  const [tags, variants, resources, categories] = await Promise.all([
    db.getAllAsync<{ chant_id: string; id: string; name: string; type: Chant['tags'][number]['type']; color: string | null }>(
      `SELECT ct.chant_id, t.id, t.name, t.type, t.color
       FROM chant_tags ct JOIN tags t ON t.id = ct.tag_id
       WHERE ct.chant_id IN (${placeholders})`,
      ids,
    ),
    db.getAllAsync<{ chant_id: string; id: string; name: string; key_signature: string | null; tempo: string | null; audio_url: string | null; sheet_url: string | null; description: string | null }>(
      `SELECT chant_id, id, name, key_signature, tempo, audio_url, sheet_url, description
       FROM chant_variants WHERE chant_id IN (${placeholders})`,
      ids,
    ),
    db.getAllAsync<{ chant_id: string; id: string; resource_type: RessourceChant['type']; file_uri: string; name: string; mime_type: string | null; size_bytes: number | null; availability: RessourceChant['availability']; sync_state: RessourceChant['sync_state']; created_at: string; metadata_json: string }>(
      `SELECT cr.chant_id, cr.id, cr.resource_type, cr.file_uri, lf.name, lf.mime_type, lf.size_bytes, lf.availability, lf.sync_state, cr.created_at, cr.metadata_json
       FROM chant_resources cr JOIN local_files lf ON lf.uri = cr.file_uri
       WHERE cr.chant_id IN (${placeholders}) ORDER BY cr.sort_order`,
      ids,
    ),
    db.getAllAsync<{ chant_id: string; category_id: string }>(
      `SELECT chant_id, category_id FROM chant_categories
       WHERE chant_id IN (${placeholders})`,
      ids,
    ),
  ]);

  for (const tag of tags) {
    const list = related.tags.get(tag.chant_id) ?? [];
    list.push({ id: tag.id, nom: tag.name, type: tag.type, couleur: tag.color ?? undefined });
    related.tags.set(tag.chant_id, list);
  }
  for (const variant of variants) {
    const list = related.variants.get(variant.chant_id) ?? [];
    list.push({
      id: variant.id,
      chant_id: variant.chant_id,
      nom_variante: variant.name,
      tonalite: variant.key_signature ?? undefined,
      tempo: variant.tempo ?? undefined,
      audio_url: variant.audio_url ?? undefined,
      partition_url: variant.sheet_url ?? undefined,
      description: variant.description ?? undefined,
    });
    related.variants.set(variant.chant_id, list);
  }
  for (const resource of resources) {
    const list = related.resources.get(resource.chant_id) ?? [];
    const metadata = safeJson<Pick<RessourceChant, 'role_audio' | 'partie_vocale' | 'description' | 'version' | 'tonalite'>>(
      resource.metadata_json,
      {},
    );
    list.push({
      id: resource.id,
      type: resource.resource_type,
      uri: resource.file_uri,
      nom: resource.name,
      mime_type: resource.mime_type ?? undefined,
      taille_octets: resource.size_bytes ?? undefined,
      ...metadata,
      created_at: resource.created_at,
      availability: resource.availability,
      sync_state: resource.sync_state,
    });
    related.resources.set(resource.chant_id, list);
  }
  for (const category of categories) {
    const list = related.categories.get(category.chant_id) ?? [];
    list.push(category.category_id);
    related.categories.set(category.chant_id, list);
  }
  return related;
}

function mapChant(row: ChantRow, related: RelatedRows): Chant {
  const metadata = safeJson<Record<string, unknown>>(row.metadata_json, {});
  return {
    ...(metadata as Partial<Chant>),
    id: row.id,
    titre: row.title,
    paroles: row.lyrics,
    traduction: row.translation ?? undefined,
    langue: row.language as Chant['langue'],
    categorie: row.primary_category_id as Chant['categorie'],
    categories: related.categories.get(row.id) as Chant['categories'],
    temps_liturgique: row.liturgical_season as Chant['temps_liturgique'],
    moment_messe: row.mass_moment as Chant['moment_messe'],
    theme: row.theme as Chant['theme'],
    tonalite: row.key_signature ?? undefined,
    tempo: row.tempo ?? undefined,
    auteur: row.author ?? undefined,
    compositeur: row.composer ?? undefined,
    niveau_difficulte: row.difficulty as Chant['niveau_difficulte'],
    audio_url: row.audio_url ?? undefined,
    partition_url: row.sheet_url ?? undefined,
    video_url: row.video_url ?? undefined,
    statut_juridique: row.legal_status as Chant['statut_juridique'],
    preuve_autorisation: row.authorization_proof ?? undefined,
    source: row.source ?? undefined,
    publie: row.published === 1,
    nombre_vues: row.view_count,
    nombre_favoris: row.favorite_count,
    tags: related.tags.get(row.id) ?? [],
    variantes: related.variants.get(row.id) ?? [],
    ressources: related.resources.get(row.id) ?? [],
    est_personnel: row.personal === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function searchChants(options: ChantSearchOptions = {}): Promise<ChantPage> {
  const db = await getChantDatabase();
  await writeQueue;
  const queries = buildChantSearchQueries(options, ftsAvailable);

  const [rows, count] = await Promise.all([
    db.getAllAsync<ChantRow>(queries.selectSql, ...queries.selectParams),
    db.getFirstAsync<{ total: number }>(queries.countSql, ...queries.countParams),
  ]);
  const related = await loadRelatedRows(db, rows);
  const total = count?.total ?? 0;
  return {
    items: rows.map((row) => mapChant(row, related)),
    total,
    hasMore: Math.max(0, Math.floor(options.offset ?? 0)) + rows.length < total,
  };
}

export async function getAllChants(): Promise<Chant[]> {
  const db = await getChantDatabase();
  await writeQueue;
  const rows = await db.getAllAsync<ChantRow>(
    'SELECT * FROM chants ORDER BY title COLLATE NOCASE, id',
  );
  const related = await loadRelatedRows(db, rows);
  return rows.map((row) => mapChant(row, related));
}

export async function getChantById(id: string): Promise<Chant | undefined> {
  const db = await getChantDatabase();
  await writeQueue;
  const row = await db.getFirstAsync<ChantRow>('SELECT * FROM chants WHERE id = ?', id);
  if (!row) return undefined;
  const related = await loadRelatedRows(db, [row]);
  return mapChant(row, related);
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const db = await getChantDatabase();
  await writeQueue;
  const rows = await db.getAllAsync<{ category_id: string; count: number }>(
    `SELECT cc.category_id, count(DISTINCT cc.chant_id) AS count
     FROM chant_categories cc GROUP BY cc.category_id`,
  );
  return Object.fromEntries(rows.map((row) => [row.category_id, row.count]));
}

export async function getLanguageCounts(): Promise<Record<string, number>> {
  const db = await getChantDatabase();
  await writeQueue;
  const rows = await db.getAllAsync<{ language: string; count: number }>(
    'SELECT language, count(*) AS count FROM chants GROUP BY language',
  );
  return Object.fromEntries(rows.map((row) => [row.language, row.count]));
}

export async function getLiturgicalSeasonCounts(): Promise<Record<string, number>> {
  const db = await getChantDatabase();
  await writeQueue;
  const rows = await db.getAllAsync<{ season: string; count: number }>(
    `SELECT liturgical_season AS season, count(*) AS count
     FROM chants WHERE liturgical_season IS NOT NULL
     GROUP BY liturgical_season`,
  );
  return Object.fromEntries(rows.map((row) => [row.season, row.count]));
}

export async function countChants(options: ChantSearchOptions = {}): Promise<number> {
  const db = await getChantDatabase();
  await writeQueue;
  const queries = buildChantSearchQueries(options, ftsAvailable);
  const row = await db.getFirstAsync<{ total: number }>(
    queries.countSql,
    ...queries.countParams,
  );
  return row?.total ?? 0;
}

export async function listCategories(): Promise<{ id: string; label: string }[]> {
  const db = await getChantDatabase();
  await writeQueue;
  return db.getAllAsync<{ id: string; label: string }>(
    'SELECT id, label FROM categories ORDER BY label COLLATE NOCASE',
  );
}

export async function importChants(
  chants: Chant[],
  options: { onConflict?: 'ignore' | 'replace' } = {},
): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    for (const [id, label] of CHANT_CATEGORIES) {
      await db.runAsync('INSERT OR IGNORE INTO categories (id, label) VALUES (?, ?)', id, label);
    }
    for (const [id, label, section, sortOrder] of MASS_PARTS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO mass_parts (id, label, section, sort_order) VALUES (?, ?, ?, ?)',
        id,
        label,
        section,
        sortOrder,
      );
    }
    for (const chant of chants) {
      await writeChant(db, chant, options.onConflict ?? 'ignore');
    }
  });
}

export async function setFavorite(
  chantId: string,
  isFavorite: boolean,
  userId = DEFAULT_USER_ID,
): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    if (isFavorite) {
      await db.runAsync(
        `INSERT INTO favorites (user_id, chant_id, created_at, sync_state)
         VALUES (?, ?, ?, 'pending')
         ON CONFLICT(user_id, chant_id) DO NOTHING`,
        userId,
        chantId,
        new Date().toISOString(),
      );
    } else {
      await db.runAsync('DELETE FROM favorites WHERE user_id = ? AND chant_id = ?', userId, chantId);
    }
  });
}

export async function replaceFavorites(
  chantIds: string[],
  userId = DEFAULT_USER_ID,
): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    await db.runAsync('DELETE FROM favorites WHERE user_id = ?', userId);
    const createdAt = new Date().toISOString();
    for (const id of new Set(chantIds)) {
      await db.runAsync(
        `INSERT OR IGNORE INTO favorites (user_id, chant_id, created_at, sync_state)
         SELECT ?, id, ?, 'pending' FROM chants WHERE id = ?`,
        userId,
        createdAt,
        id,
      );
    }
  });
}

export async function getFavoriteIds(userId = DEFAULT_USER_ID): Promise<string[]> {
  const db = await getChantDatabase();
  const rows = await db.getAllAsync<{ chant_id: string }>(
    'SELECT chant_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    userId,
  );
  return rows.map((row) => row.chant_id);
}

export async function recordChantView(chantId: string): Promise<void> {
  const db = await getChantDatabase();
  await db.runAsync(
    `INSERT INTO chant_history (chant_id, last_viewed_at, view_count)
     SELECT id, ?, 1 FROM chants WHERE id = ?
     ON CONFLICT(chant_id) DO UPDATE SET
       last_viewed_at = excluded.last_viewed_at,
       view_count = chant_history.view_count + 1`,
    new Date().toISOString(),
    chantId,
  );
}

export async function recordChantListen(chantId: string): Promise<void> {
  const db = await getChantDatabase();
  await db.runAsync(
    `INSERT INTO chant_history (chant_id, last_viewed_at, view_count, last_listened_at, listen_count)
     SELECT id, ?, 1, ?, 1 FROM chants WHERE id = ?
     ON CONFLICT(chant_id) DO UPDATE SET
       last_listened_at = excluded.last_listened_at,
       listen_count = chant_history.listen_count + 1`,
    new Date().toISOString(),
    new Date().toISOString(),
    chantId,
  );
}

export async function getChantHistory(limit = 100): Promise<ChantHistoryEntry[]> {
  const db = await getChantDatabase();
  const rows = await db.getAllAsync<{
    chant_id: string;
    last_viewed_at: string;
    view_count: number;
    last_listened_at: string | null;
    listen_count: number;
  }>(
    `SELECT h.chant_id, h.last_viewed_at, h.view_count, h.last_listened_at, h.listen_count
     FROM chant_history h
     INNER JOIN chants c ON c.id = h.chant_id
     ORDER BY max(h.last_viewed_at, coalesce(h.last_listened_at, '')) DESC
     LIMIT ?`,
    Math.max(1, Math.min(500, Math.floor(limit))),
  );
  return rows.map((row) => ({
    chantId: row.chant_id,
    lastViewedAt: row.last_viewed_at,
    viewCount: row.view_count,
    lastListenedAt: row.last_listened_at,
    listenCount: row.listen_count,
  }));
}

export async function removeChantHistoryEntry(chantId: string): Promise<void> {
  const db = await getChantDatabase();
  await db.runAsync('DELETE FROM chant_history WHERE chant_id = ?', chantId);
}

export async function clearChantHistory(): Promise<void> {
  const db = await getChantDatabase();
  await db.runAsync('DELETE FROM chant_history');
}

export async function replaceMassCelebrations(celebrations: Celebration[]): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    const ids = [...new Set(celebrations.map((celebration) => celebration.id))];
    if (ids.length === 0) {
      await db.runAsync('DELETE FROM mass_celebrations');
    } else {
      await db.runAsync(
        `DELETE FROM mass_celebrations WHERE id NOT IN (${ids.map(() => '?').join(', ')})`,
        ...ids,
      );
    }

    for (const celebration of celebrations) {
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO mass_celebrations
           (id, title, date, created_at, updated_at, status, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           date = excluded.date,
           updated_at = excluded.updated_at,
           status = excluded.status,
           metadata_json = excluded.metadata_json`,
        celebration.id,
        celebration.title,
        celebration.date,
        celebration.created_at ?? now,
        celebration.updated_at ?? now,
        celebration.status ?? 'draft',
        JSON.stringify(celebration),
      );
      await db.runAsync('DELETE FROM mass_celebration_items WHERE celebration_id = ?', celebration.id);
      for (const [slotKey, chantIds] of Object.entries(celebration.selectedChants)) {
        const partId = slotKey.startsWith('slot:') ? slotKey.slice('slot:'.length) : slotKey;
        await db.runAsync(
          `INSERT OR IGNORE INTO mass_parts (id, label, section, sort_order)
           VALUES (?, ?, 'Personnalisé', 100)`,
          partId,
          partId.replaceAll('_', ' '),
        );
        for (const [sortOrder, chantId] of (chantIds ?? []).entries()) {
          const chantExists = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM chants WHERE id = ?',
            chantId,
          );
          if (!chantExists) continue;
          await db.runAsync(
            `INSERT OR IGNORE INTO mass_celebration_items
              (celebration_id, mass_part_id, chant_id, sort_order) VALUES (?, ?, ?, ?)`,
            celebration.id,
            partId,
            chantId,
            sortOrder,
          );
        }
      }
    }
  });
}

export async function getMassCelebrations(): Promise<Celebration[]> {
  const db = await getChantDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    date: string;
    created_at: string;
    updated_at: string;
    status: string;
    metadata_json: string;
  }>(
    `SELECT id, title, date, created_at, updated_at, status, metadata_json
     FROM mass_celebrations
     ORDER BY updated_at DESC, created_at DESC`,
  );
  const celebrations: Celebration[] = [];
  for (const row of rows) {
    let metadata: Partial<Celebration> = {};
    try {
      const parsed: unknown = JSON.parse(row.metadata_json);
      if (parsed && typeof parsed === 'object') metadata = parsed as Partial<Celebration>;
    } catch (error) {
      console.error(`Métadonnées de préparation Messe illisibles (${row.id}).`, error);
    }
    const itemRows = await db.getAllAsync<{ mass_part_id: string; chant_id: string }>(
      `SELECT mass_part_id, chant_id
       FROM mass_celebration_items
       WHERE celebration_id = ?
       ORDER BY mass_part_id, sort_order`,
      row.id,
    );
    const selectedChants: Partial<Record<string, string[]>> = {};
    for (const item of itemRows) {
      (selectedChants[`slot:${item.mass_part_id}`] ??= []).push(item.chant_id);
    }
    celebrations.push({
      ...metadata,
      id: row.id,
      title: row.title,
      date: row.date,
      temps_liturgique: metadata.temps_liturgique ?? 'temps_ordinaire',
      selectedChants,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      status: row.status === 'completed' ? 'completed' : 'draft',
      customMoments: metadata.customMoments ?? [],
    });
  }
  return celebrations;
}

export async function savePersonalChant(chant: Chant): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    await writeChant(db, { ...chant, est_personnel: true }, 'replace');
    await db.runAsync(
      `INSERT INTO personal_library (user_id, chant_id, created_at, sync_state)
       VALUES (?, ?, ?, 'local_only')
       ON CONFLICT(user_id, chant_id) DO UPDATE SET sync_state = 'local_only'`,
      DEFAULT_USER_ID,
      chant.id,
      chant.created_at,
    );
  });
}

export async function saveCatalogChant(chant: Chant): Promise<string[]> {
  const db = await getChantDatabase();
  return withWriteTransaction(db, async () => {
    const previous = await db.getAllAsync<{ file_uri: string }>(
      'SELECT file_uri FROM chant_resources WHERE chant_id = ?',
      chant.id,
    );
    await writeChant(db, chant, 'replace');
    const orphaned: string[] = [];
    for (const uri of new Set(previous.map((resource) => resource.file_uri))) {
      const references = await db.getFirstAsync<{ total: number }>(
        'SELECT count(*) AS total FROM chant_resources WHERE file_uri = ?',
        uri,
      );
      if ((references?.total ?? 0) === 0) orphaned.push(uri);
    }
    return orphaned;
  });
}

export async function addChantResource(chantId: string, resource: RessourceChant): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    const chant = await db.getFirstAsync<{ id: string }>('SELECT id FROM chants WHERE id = ?', chantId);
    if (!chant) throw new Error('Ce chant n’existe plus dans la bibliothèque.');
    const order = await db.getFirstAsync<{ next_order: number }>(
      'SELECT coalesce(max(sort_order), -1) + 1 AS next_order FROM chant_resources WHERE chant_id = ?',
      chantId,
    );
    await insertResource(db, chantId, resource, order?.next_order ?? 0);
  });
}

export async function updateChantResource(
  chantId: string,
  resourceId: string,
  updates: Pick<RessourceChant, 'nom' | 'role_audio' | 'partie_vocale' | 'description' | 'version' | 'tonalite'>,
): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    const resource = await db.getFirstAsync<{ metadata_json: string }>(
      'SELECT metadata_json FROM chant_resources WHERE chant_id = ? AND id = ?',
      chantId,
      resourceId,
    );
    if (!resource) throw new Error('Cette ressource n’est plus associée à ce chant.');
    await db.runAsync(
      `UPDATE local_files SET name = ?, updated_at = ?
       WHERE uri = (SELECT file_uri FROM chant_resources WHERE id = ? AND chant_id = ?)`,
      updates.nom.trim(),
      new Date().toISOString(),
      resourceId,
      chantId,
    );
    await db.runAsync(
      'UPDATE chant_resources SET metadata_json = ? WHERE id = ? AND chant_id = ?',
      toJson({
        role_audio: updates.role_audio,
        partie_vocale: updates.partie_vocale,
        description: updates.description,
        version: updates.version,
        tonalite: updates.tonalite,
      }),
      resourceId,
      chantId,
    );
  });
}

export async function replaceChantResourceFile(
  chantId: string,
  resource: RessourceChant,
): Promise<{ uri: string; unreferenced: boolean }> {
  const db = await getChantDatabase();
  return withWriteTransaction(db, async () => {
    const existing = await db.getFirstAsync<{ file_uri: string; sort_order: number }>(
      'SELECT file_uri, sort_order FROM chant_resources WHERE chant_id = ? AND id = ?',
      chantId,
      resource.id,
    );
    if (!existing) throw new Error('Cette ressource n’est plus associée à ce chant.');
    if (existing.file_uri === resource.uri) throw new Error('Le nouveau fichier est identique à celui déjà associé.');
    await insertResource(db, chantId, resource, existing.sort_order);
    const references = await db.getFirstAsync<{ total: number }>(
      'SELECT count(*) AS total FROM chant_resources WHERE file_uri = ?',
      existing.file_uri,
    );
    return { uri: existing.file_uri, unreferenced: (references?.total ?? 0) === 0 };
  });
}

export async function removeChantResource(
  chantId: string,
  resourceId: string,
): Promise<{ uri: string; unreferenced: boolean } | undefined> {
  const db = await getChantDatabase();
  return withWriteTransaction(db, async () => {
    const row = await db.getFirstAsync<{ file_uri: string }>(
      'SELECT file_uri FROM chant_resources WHERE chant_id = ? AND id = ?',
      chantId,
      resourceId,
    );
    if (!row) return undefined;
    await db.runAsync('DELETE FROM chant_resources WHERE chant_id = ? AND id = ?', chantId, resourceId);
    const references = await db.getFirstAsync<{ total: number }>(
      'SELECT count(*) AS total FROM chant_resources WHERE file_uri = ?',
      row.file_uri,
    );
    return { uri: row.file_uri, unreferenced: (references?.total ?? 0) === 0 };
  });
}

export const removePersonalChantResource = removeChantResource;

export async function removeUnreferencedLocalFileRecord(uri: string): Promise<void> {
  const db = await getChantDatabase();
  await withWriteTransaction(db, async () => {
    await db.runAsync(
      `DELETE FROM local_files
       WHERE uri = ? AND NOT EXISTS (SELECT 1 FROM chant_resources WHERE file_uri = ?)`,
      uri,
      uri,
    );
  });
}

export async function deleteLocalFileIfUnreferenced(uri: string): Promise<boolean> {
  const db = await getChantDatabase();
  return withWriteTransaction(db, async () => {
    const references = await db.getFirstAsync<{ total: number }>(
      'SELECT count(*) AS total FROM chant_resources WHERE file_uri = ?',
      uri,
    );
    if ((references?.total ?? 0) > 0) return false;

    if (isLocalFileUri(uri)) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) await FileSystem.deleteAsync(uri);
    }
    await db.runAsync('DELETE FROM local_files WHERE uri = ?', uri);
    return true;
  });
}

export async function setLocalFileAvailability(
  uri: string,
  availability: 'available' | 'missing' | 'failed',
  lastError?: string,
): Promise<void> {
  const db = await getChantDatabase();
  await db.runAsync(
    'UPDATE local_files SET availability = ?, last_error = ?, updated_at = ? WHERE uri = ?',
    availability,
    optional(lastError),
    new Date().toISOString(),
    uri,
  );
}

export async function initializeLocalChantDatabase(input: {
  personalChants: Chant[];
  favoriteIds: string[];
  celebrations: Celebration[];
}): Promise<{ chants: Chant[]; favoriteIds: string[]; celebrations: Celebration[] }> {
  await getChantDatabase();
  await importChants(initialChants, { onConflict: 'ignore' });
  await importChants(input.personalChants, { onConflict: 'replace' });
  const savedFavoriteIds = await getFavoriteIds();
  await replaceFavorites([...new Set([...savedFavoriteIds, ...input.favoriteIds])]);
  const savedCelebrations = await getMassCelebrations();
  const celebrationsById = new Map(savedCelebrations.map((celebration) => [celebration.id, celebration]));
  for (const celebration of input.celebrations) {
    celebrationsById.set(celebration.id, celebration);
  }
  const availableChants = await getAllChants();
  const availableChantIds = new Set(availableChants.map((chant) => chant.id));
  const celebrations = [...celebrationsById.values()].map((celebration) => ({
    ...celebration,
    selectedChants: Object.fromEntries(
      Object.entries(celebration.selectedChants)
        .map(([slot, ids]) => [slot, (ids ?? []).filter((id) => availableChantIds.has(id))])
        .filter(([, ids]) => (ids as string[]).length > 0)
    ),
  }));
  await replaceMassCelebrations(celebrations);
  return { chants: availableChants, favoriteIds: await getFavoriteIds(), celebrations };
}
