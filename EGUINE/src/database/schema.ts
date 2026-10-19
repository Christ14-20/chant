export const CHANT_CATEGORIES = [
  ['entree', 'Entrée'],
  ['kyrie', 'Kyrie'],
  ['gloria', 'Gloria'],
  ['psaume', 'Psaume'],
  ['acclamation', 'Acclamation'],
  ['credo', 'Credo'],
  ['priere_universelle', 'Prière universelle'],
  ['offertoire', 'Offertoire'],
  ['sanctus', 'Sanctus'],
  ['agnus_dei', 'Agnus Dei'],
  ['communion', 'Communion'],
  ['action_grace', 'Action de grâce'],
  ['chant_final', 'Chant final'],
  ['louange', 'Louange'],
  ['adoration', 'Adoration'],
  ['penitence', 'Pénitence'],
  ['marial', 'Marial'],
  ['funerailles', 'Funérailles'],
  ['autre', 'Autre'],
] as const;

export const MASS_PARTS = [
  ['entree', 'Chant d’entrée', 'Ouverture', 0],
  ['kyrie', 'Kyrie', 'Ouverture', 1],
  ['gloria', 'Gloria', 'Ouverture', 2],
  ['premiere_lecture', 'Première lecture', 'Liturgie de la Parole', 3],
  ['psaume', 'Psaume', 'Liturgie de la Parole', 4],
  ['deuxieme_lecture', 'Deuxième lecture', 'Liturgie de la Parole', 5],
  ['acclamation', 'Acclamation', 'Liturgie de la Parole', 6],
  ['evangile', 'Évangile', 'Liturgie de la Parole', 7],
  ['homelie', 'Homélie', 'Liturgie de la Parole', 8],
  ['credo', 'Credo', 'Liturgie de la Parole', 9],
  ['priere_universelle', 'Prière universelle', 'Liturgie de la Parole', 10],
  ['offertoire', 'Offertoire', 'Liturgie eucharistique', 11],
  ['sanctus', 'Sanctus', 'Liturgie eucharistique', 12],
  ['agnus_dei', 'Agnus Dei', 'Liturgie eucharistique', 13],
  ['communion', 'Communion', 'Liturgie eucharistique', 14],
  ['action_grace', 'Action de grâce', 'Liturgie eucharistique', 15],
  ['envoi', 'Chant d’envoi', 'Envoi', 16],
] as const;

export const DATABASE_MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        label TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mass_parts (
        id TEXT PRIMARY KEY NOT NULL,
        label TEXT NOT NULL,
        section TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chants (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        lyrics TEXT NOT NULL DEFAULT '',
        translation TEXT,
        language TEXT NOT NULL,
        primary_category_id TEXT NOT NULL REFERENCES categories(id),
        liturgical_season TEXT,
        mass_moment TEXT,
        theme TEXT,
        key_signature TEXT,
        tempo TEXT,
        author TEXT,
        composer TEXT,
        difficulty TEXT,
        audio_url TEXT,
        sheet_url TEXT,
        video_url TEXT,
        legal_status TEXT NOT NULL,
        authorization_proof TEXT,
        source TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        view_count INTEGER NOT NULL DEFAULT 0,
        favorite_count INTEGER NOT NULL DEFAULT 0,
        personal INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS chant_categories (
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        category_id TEXT NOT NULL REFERENCES categories(id),
        PRIMARY KEY (chant_id, category_id)
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT
      );

      CREATE TABLE IF NOT EXISTS chant_tags (
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id),
        PRIMARY KEY (chant_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS chant_mass_parts (
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        mass_part_id TEXT NOT NULL REFERENCES mass_parts(id),
        PRIMARY KEY (chant_id, mass_part_id)
      );

      CREATE TABLE IF NOT EXISTS chant_variants (
        id TEXT PRIMARY KEY NOT NULL,
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_signature TEXT,
        tempo TEXT,
        audio_url TEXT,
        sheet_url TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT NOT NULL,
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'pending'
          CHECK (sync_state IN ('pending', 'synced', 'failed')),
        PRIMARY KEY (user_id, chant_id)
      );

      CREATE TABLE IF NOT EXISTS personal_library (
        user_id TEXT NOT NULL,
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'local_only'
          CHECK (sync_state IN ('local_only', 'pending', 'synced', 'failed')),
        PRIMARY KEY (user_id, chant_id)
      );

      CREATE TABLE IF NOT EXISTS local_files (
        uri TEXT PRIMARY KEY NOT NULL,
        file_type TEXT NOT NULL CHECK (file_type IN ('audio', 'image', 'pdf')),
        name TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        availability TEXT NOT NULL DEFAULT 'importing'
          CHECK (availability IN ('importing', 'available', 'missing', 'failed')),
        sync_state TEXT NOT NULL DEFAULT 'local_only'
          CHECK (sync_state IN ('local_only', 'pending', 'syncing', 'synced', 'failed')),
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chant_resources (
        id TEXT PRIMARY KEY NOT NULL,
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        file_uri TEXT NOT NULL REFERENCES local_files(uri),
        resource_type TEXT NOT NULL CHECK (resource_type IN ('audio', 'image', 'pdf')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mass_celebrations (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mass_celebration_items (
        celebration_id TEXT NOT NULL REFERENCES mass_celebrations(id) ON DELETE CASCADE,
        mass_part_id TEXT NOT NULL REFERENCES mass_parts(id),
        chant_id TEXT NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (celebration_id, mass_part_id, chant_id)
      );

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending'
          CHECK (state IN ('pending', 'syncing', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (entity_type, entity_id, operation)
      );

      CREATE INDEX IF NOT EXISTS idx_chants_title ON chants(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_chants_language_category ON chants(language, primary_category_id);
      CREATE INDEX IF NOT EXISTS idx_chants_updated ON chants(updated_at DESC, id);
      CREATE INDEX IF NOT EXISTS idx_chant_categories_category ON chant_categories(category_id, chant_id);
      CREATE INDEX IF NOT EXISTS idx_chant_tags_tag ON chant_tags(tag_id, chant_id);
      CREATE INDEX IF NOT EXISTS idx_chant_mass_parts_part ON chant_mass_parts(mass_part_id, chant_id);
      CREATE INDEX IF NOT EXISTS idx_variants_chant ON chant_variants(chant_id, name);
      CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_personal_library_user_created ON personal_library(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_local_files_availability ON local_files(availability, sync_state);
      CREATE INDEX IF NOT EXISTS idx_resources_file_uri ON chant_resources(file_uri);
      CREATE INDEX IF NOT EXISTS idx_celebration_items_part ON mass_celebration_items(celebration_id, mass_part_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_state ON sync_outbox(state, created_at);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS chants_fts USING fts5(
        title, lyrics, author, composer,
        content='chants', content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS chants_fts_insert AFTER INSERT ON chants BEGIN
        INSERT INTO chants_fts(rowid, title, lyrics, author, composer)
        VALUES (new.rowid, new.title, new.lyrics, coalesce(new.author, ''), coalesce(new.composer, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS chants_fts_delete AFTER DELETE ON chants BEGIN
        INSERT INTO chants_fts(chants_fts, rowid, title, lyrics, author, composer)
        VALUES ('delete', old.rowid, old.title, old.lyrics, coalesce(old.author, ''), coalesce(old.composer, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS chants_fts_update AFTER UPDATE ON chants BEGIN
        INSERT INTO chants_fts(chants_fts, rowid, title, lyrics, author, composer)
        VALUES ('delete', old.rowid, old.title, old.lyrics, coalesce(old.author, ''), coalesce(old.composer, ''));
        INSERT INTO chants_fts(rowid, title, lyrics, author, composer)
        VALUES (new.rowid, new.title, new.lyrics, coalesce(new.author, ''), coalesce(new.composer, ''));
      END;

      INSERT INTO chants_fts(chants_fts) VALUES ('rebuild');
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE mass_celebrations
        ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
      ALTER TABLE mass_celebrations
        ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
      ALTER TABLE mass_celebrations
        ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';

      UPDATE mass_celebrations
      SET updated_at = created_at
      WHERE updated_at = '';

      CREATE TABLE IF NOT EXISTS chant_history (
        chant_id TEXT PRIMARY KEY NOT NULL REFERENCES chants(id) ON DELETE CASCADE,
        last_viewed_at TEXT NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 1,
        last_listened_at TEXT,
        listen_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_chant_history_recent
        ON chant_history(last_viewed_at DESC);
    `,
  },
  {
    version: 4,
    sql: `
      DELETE FROM mass_celebrations
      WHERE id = 'default' AND title = 'Messe du dimanche' AND date = '2024-09-22';

      DELETE FROM favorites
      WHERE chant_id IN (
        SELECT id FROM chants
        WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')
          AND personal = 0
      );
      DELETE FROM personal_library
      WHERE chant_id IN (
        SELECT id FROM chants
        WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')
          AND personal = 0
      );
      DELETE FROM chants WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12') AND personal = 0;
    `,
  },
  {
    version: 5,
    sql: `
      INSERT OR IGNORE INTO favorites (user_id, chant_id, created_at, sync_state)
      SELECT user_id, 'songbook-109', created_at, sync_state
      FROM favorites WHERE chant_id = 'songbook-835';
      INSERT OR IGNORE INTO favorites (user_id, chant_id, created_at, sync_state)
      SELECT user_id, 'songbook-873', created_at, sync_state
      FROM favorites WHERE chant_id = 'songbook-900';
      DELETE FROM favorites WHERE chant_id IN ('songbook-835', 'songbook-900');

      INSERT OR IGNORE INTO personal_library (user_id, chant_id, created_at, sync_state)
      SELECT user_id, 'songbook-109', created_at, sync_state
      FROM personal_library WHERE chant_id = 'songbook-835';
      INSERT OR IGNORE INTO personal_library (user_id, chant_id, created_at, sync_state)
      SELECT user_id, 'songbook-873', created_at, sync_state
      FROM personal_library WHERE chant_id = 'songbook-900';
      DELETE FROM personal_library WHERE chant_id IN ('songbook-835', 'songbook-900');

      UPDATE OR IGNORE mass_celebration_items
      SET chant_id = 'songbook-109' WHERE chant_id = 'songbook-835';
      UPDATE OR IGNORE mass_celebration_items
      SET chant_id = 'songbook-873' WHERE chant_id = 'songbook-900';
      DELETE FROM chants WHERE id IN ('songbook-835', 'songbook-900') AND personal = 0;
    `,
  },
  {
    version: 6,
    sql: `
      ALTER TABLE chant_resources
        ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
    `,
  },
] as const;

export const CHANT_PAGE_SELECT = `
  SELECT c.*
  FROM chants c
`;
