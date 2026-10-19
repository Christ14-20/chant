import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { DATABASE_MIGRATIONS } from '../src/database/schema.ts';
import { buildChantSearchQueries } from '../src/database/search-query.ts';
import { CHANT_CATEGORIES } from '../src/database/schema.ts';
import { songbookChants } from '../src/data/songbookChants.ts';
import { copyIntoPersistentStorage } from '../src/utils/personal-chant-storage-core.ts';
import { sanitizeResourceName, validateChantFile } from '../src/utils/chant-resource-import-core.ts';
import { resolveInitialCelebrations } from '../src/utils/initial-celebration.ts';

function openMigratedDatabase(path = ':memory:', throughVersion = Number.POSITIVE_INFINITY) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  for (const migration of DATABASE_MIGRATIONS) {
    if (migration.version > throughVersion) continue;
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (migration.version <= version) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      if (migration.version !== 2) throw error;
      db.exec(`PRAGMA user_version = ${migration.version}`);
    }
  }
  for (const [id, label] of [['entree', 'Entrée'], ['louange', 'Louange'], ['communion', 'Communion'], ['autre', 'Autre']]) {
    db.prepare('INSERT OR IGNORE INTO categories (id, label) VALUES (?, ?)').run(id, label);
  }
  for (const [id, label] of [['entree', 'Entrée'], ['communion', 'Communion'], ['envoi', 'Envoi']]) {
    db.prepare('INSERT OR IGNORE INTO mass_parts (id, label, section, sort_order) VALUES (?, ?, ?, ?)').run(id, label, 'Test', 0);
  }
  return db;
}

function insertChant(db, id, title, lyrics, category = 'entree', language = 'fr') {
  db.prepare(`
    INSERT INTO chants (id, title, lyrics, language, primary_category_id, legal_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'domaine_public', '2026-01-01', '2026-01-01')
    ON CONFLICT(id) DO NOTHING
  `).run(id, title, lyrics, language, category);
  db.prepare('INSERT OR IGNORE INTO chant_categories (chant_id, category_id) VALUES (?, ?)').run(id, category);
}

test('les migrations créent le schéma et les index sur une base réouverte', () => {
  const directory = mkdtempSync(join(tmpdir(), 'eguine-sqlite-'));
  const path = join(directory, 'chants.db');
  try {
    let db = openMigratedDatabase(path);
    insertChant(db, 'reopen-1', 'Chant persistant', 'Paroles hors connexion');
    db.close();

    db = openMigratedDatabase(path);
    assert.equal(db.prepare('SELECT title FROM chants WHERE id = ?').get('reopen-1').title, 'Chant persistant');
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_chants_language_category'").get());
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 6);
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='chant_history'").get());
    db.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('le catalogue initial est complet, classé et sans doublons', () => {
  const initialSource = readFileSync(new URL('../src/data/initialChants.ts', import.meta.url), 'utf8');
  const latinIds = [...initialSource.matchAll(/id: '(chant-[^']+)'/g)].map((match) => match[1]);
  const catalog = [...songbookChants, ...latinIds.map((id) => ({ id }))];
  const ids = new Set(catalog.map((chant) => chant.id));
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const titles = new Set(songbookChants.map((chant) => normalize(chant.titre)));
  const lyrics = new Set(songbookChants.map((chant) => normalize(chant.paroles)));
  const categories = new Set(CHANT_CATEGORIES.map(([id]) => id));
  const languages = new Set(['fr', 'la', 'es', 'soussou', 'poular', 'malinke', 'kissi', 'guerze', 'toma', 'kpele', 'baga', 'loma', 'mano', 'kono', 'en']);
  const seasons = new Set(['toute_annee', 'avent', 'noel', 'careme', 'triduum_pascal', 'temps_pascal', 'temps_ordinaire']);

  assert.equal(songbookChants.length + latinIds.length, 479);
  assert.equal(latinIds.length, 9);
  assert.equal(ids.size, catalog.length);
  assert.equal(titles.size, songbookChants.length);
  assert.equal(lyrics.size, songbookChants.length);
  assert.ok(songbookChants.every((chant) => categories.has(chant.categorie)));
  assert.ok(songbookChants.every((chant) => languages.has(chant.langue)));
  assert.ok(songbookChants.every((chant) => seasons.has(chant.temps_liturgique)));
  assert.ok(songbookChants.every((chant) => chant.paroles.trim().length >= 50));
});

test('la recherche combine plusieurs catégories, langues et temps liturgiques', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'classified-fr', 'Chant français', 'Paroles', 'louange', 'fr');
  insertChant(db, 'classified-la', 'Chant latin', 'Paroles', 'entree', 'la');
  insertChant(db, 'classified-es', 'Chant espagnol', 'Paroles', 'communion', 'es');
  db.prepare('UPDATE chants SET liturgical_season = ? WHERE id = ?').run('avent', 'classified-fr');
  db.prepare('UPDATE chants SET liturgical_season = ? WHERE id = ?').run('careme', 'classified-la');
  db.prepare('UPDATE chants SET liturgical_season = ? WHERE id = ?').run('noel', 'classified-es');

  const queries = buildChantSearchQueries({
    categories: ['louange', 'entree'],
    languages: ['fr', 'la'],
    liturgicalSeasons: ['avent', 'careme'],
  }, false);
  const rows = db.prepare(queries.selectSql).all(...queries.selectParams);
  assert.deepEqual(rows.map((row) => row.id), ['classified-fr', 'classified-la']);
  assert.equal(db.prepare(queries.countSql).get(...queries.countParams).total, 2);
  db.close();
});

test('la migration retire les chants d’exemple sans supprimer les contenus utilisateur', () => {
  const db = openMigratedDatabase(':memory:', 3);
  insertChant(db, '1', 'Ancien exemple', 'Paroles de démonstration');
  insertChant(db, 'chant-000001', 'Pange Lingua Gloriosi', 'Paroles latines', 'entree', 'la');
  insertChant(db, 'personal-1', 'Chant personnel', 'Paroles personnelles');
  db.prepare('UPDATE chants SET personal = 1 WHERE id = ?').run('personal-1');
  db.prepare('INSERT INTO favorites (user_id, chant_id, created_at) VALUES (?, ?, ?)').run('local', '1', '2026-01-01');
  db.prepare('INSERT INTO favorites (user_id, chant_id, created_at) VALUES (?, ?, ?)').run('local', 'personal-1', '2026-01-01');
  db.prepare(`
    INSERT INTO mass_celebrations (id, title, date, created_at, updated_at, status, metadata_json)
    VALUES ('default', 'Messe du dimanche', '2024-09-22', '2024-09-22', '2024-09-22', 'draft', '{}'),
           ('saved-mass', 'Messe préparée', '2026-10-18', '2026-10-01', '2026-10-02', 'draft', '{}')
  `).run();

  db.exec(DATABASE_MIGRATIONS.find((migration) => migration.version === 4).sql);

  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('1').count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('chant-000001').count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('personal-1').count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM favorites WHERE chant_id = ?').get('1').count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM favorites WHERE chant_id = ?').get('personal-1').count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM mass_celebrations WHERE id = ?').get('default').count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM mass_celebrations WHERE id = ?').get('saved-mass').count, 1);
  db.close();
});

test('l’historique des chants déduplique par identifiant et ne supprime pas la source', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'history-1', 'Chant consulté', 'Paroles');
  const recordView = db.prepare(`
    INSERT INTO chant_history (chant_id, last_viewed_at, view_count)
    SELECT id, ?, 1 FROM chants WHERE id = ?
    ON CONFLICT(chant_id) DO UPDATE SET
      last_viewed_at = excluded.last_viewed_at,
      view_count = chant_history.view_count + 1
  `);
  recordView.run('2026-10-16T10:00:00.000Z', 'history-1');
  recordView.run('2026-10-16T11:00:00.000Z', 'history-1');
  assert.equal(db.prepare('SELECT count(*) AS count FROM chant_history').get().count, 1);
  assert.equal(db.prepare('SELECT view_count FROM chant_history WHERE chant_id = ?').get('history-1').view_count, 2);
  db.prepare('DELETE FROM chant_history WHERE chant_id = ?').run('history-1');
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('history-1').count, 1);
  db.close();
});

test('les écoutes réelles sont comptées séparément et remontent dans l’activité récente', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'listened-1', 'Chant écouté', 'Paroles');
  insertChant(db, 'viewed-1', 'Chant consulté', 'Paroles');
  db.prepare(`
    INSERT INTO chant_history (chant_id, last_viewed_at, view_count)
    SELECT id, ?, 1 FROM chants WHERE id = ?
    ON CONFLICT(chant_id) DO UPDATE SET
      last_viewed_at = excluded.last_viewed_at,
      view_count = chant_history.view_count + 1
  `).run('2026-10-16T09:00:00.000Z', 'listened-1');
  const recordListen = db.prepare(`
    INSERT INTO chant_history (chant_id, last_viewed_at, view_count, last_listened_at, listen_count)
    SELECT id, ?, 1, ?, 1 FROM chants WHERE id = ?
    ON CONFLICT(chant_id) DO UPDATE SET
      last_listened_at = excluded.last_listened_at,
      listen_count = chant_history.listen_count + 1
  `);
  recordListen.run('2026-10-16T10:00:00.000Z', '2026-10-16T10:00:00.000Z', 'listened-1');
  recordListen.run('2026-10-16T11:00:00.000Z', '2026-10-16T11:00:00.000Z', 'listened-1');
  db.prepare(`
    INSERT INTO chant_history (chant_id, last_viewed_at, view_count)
    SELECT id, ?, 1 FROM chants WHERE id = ?
  `).run('2026-10-16T10:30:00.000Z', 'viewed-1');

  const history = db.prepare(`
    SELECT chant_id, view_count, listen_count, last_listened_at
    FROM chant_history
    ORDER BY max(last_viewed_at, coalesce(last_listened_at, '')) DESC
  `).all();
  assert.deepEqual(history.map((entry) => entry.chant_id), ['listened-1', 'viewed-1']);
  assert.equal(history[0].view_count, 1);
  assert.equal(history[0].listen_count, 2);
  assert.equal(history[0].last_listened_at, '2026-10-16T11:00:00.000Z');
  db.close();
});

test('les préparations de Messe restent isolées et conservent l’ordre des chants', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'mass-first', 'Premier', 'Paroles');
  insertChant(db, 'mass-second', 'Second', 'Paroles');
  const createPreparation = db.prepare(`
    INSERT INTO mass_celebrations (id, title, date, created_at, updated_at, status, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  createPreparation.run('mass-a', 'Messe du dimanche', '2026-10-18', '2026-10-01', '2026-10-10', 'draft', '{"customMoments":[]}');
  createPreparation.run('mass-b', 'Messe de fête', '2026-11-01', '2026-10-02', '2026-10-11', 'completed', '{}');
  const addSong = db.prepare(`
    INSERT INTO mass_celebration_items (celebration_id, mass_part_id, chant_id, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  addSong.run('mass-a', 'entree', 'mass-second', 1);
  addSong.run('mass-a', 'entree', 'mass-first', 0);
  addSong.run('mass-b', 'entree', 'mass-second', 0);
  const orderedIds = db.prepare(`
    SELECT chant_id FROM mass_celebration_items
    WHERE celebration_id = ? AND mass_part_id = ?
    ORDER BY sort_order
  `).all('mass-a', 'entree').map((row) => row.chant_id);
  assert.deepEqual(orderedIds, ['mass-first', 'mass-second']);
  db.prepare('DELETE FROM mass_celebrations WHERE id = ?').run('mass-a');
  assert.equal(db.prepare('SELECT count(*) AS count FROM mass_celebrations').get().count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM mass_celebration_items WHERE celebration_id = ?').get('mass-b').count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants').get().count, 2);
  db.close();
});

test('une première préparation de Messe est créée une seule fois au premier lancement', () => {
  const now = new Date(2026, 9, 19, 12);
  const firstLaunch = resolveInitialCelebrations([], [], false, now, 'fr');
  assert.equal(firstLaunch.celebrations.length, 1);
  assert.equal(firstLaunch.celebrations[0].id, 'messe-first-run');
  assert.equal(firstLaunch.celebrations[0].title, 'Ma première messe');
  assert.deepEqual(firstLaunch.celebrations[0].selectedChants, {});
  assert.ok(firstLaunch.celebrations[0].slotOrder.length > 0);
  assert.equal(firstLaunch.hasBootstrappedCelebrations, true);

  const afterDeletingAll = resolveInitialCelebrations([], [], true, now, 'fr');
  assert.deepEqual(afterDeletingAll.celebrations, []);

  const englishFirstLaunch = resolveInitialCelebrations([], [], false, now, 'en');
  assert.equal(englishFirstLaunch.celebrations[0].title, 'My first Mass');

  const existing = { ...firstLaunch.celebrations[0], id: 'saved-mass', title: 'Messe sauvegardée' };
  const restored = resolveInitialCelebrations([existing], [], false, now, 'en');
  assert.deepEqual(restored.celebrations, [existing]);
});

test('les chants peuvent être créés, modifiés et supprimés sans doublon', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'same-id', 'Premier titre', 'Paroles');
  insertChant(db, 'same-id', 'Titre du doublon', 'Autres paroles');
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('same-id').count, 1);
  assert.equal(db.prepare('SELECT title FROM chants WHERE id = ?').get('same-id').title, 'Premier titre');
  db.prepare('UPDATE chants SET title = ? WHERE id = ?').run('Titre modifié', 'same-id');
  assert.equal(db.prepare('SELECT title FROM chants WHERE id = ?').get('same-id').title, 'Titre modifié');
  db.prepare('DELETE FROM chants WHERE id = ?').run('same-id');
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('same-id').count, 0);
  db.close();
});

test('les associations multiples aux catégories et parties de Messe évitent les doublons', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'multi-1', 'Chant commun', 'Paroles communes');
  const category = db.prepare('INSERT OR IGNORE INTO chant_categories (chant_id, category_id) VALUES (?, ?)');
  category.run('multi-1', 'entree');
  category.run('multi-1', 'louange');
  category.run('multi-1', 'louange');
  const part = db.prepare('INSERT OR IGNORE INTO chant_mass_parts (chant_id, mass_part_id) VALUES (?, ?)');
  part.run('multi-1', 'entree');
  part.run('multi-1', 'communion');
  part.run('multi-1', 'communion');
  assert.equal(db.prepare('SELECT count(*) AS count FROM chants WHERE id = ?').get('multi-1').count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM chant_categories WHERE chant_id = ?').get('multi-1').count, 2);
  assert.equal(db.prepare('SELECT count(*) AS count FROM chant_mass_parts WHERE chant_id = ?').get('multi-1').count, 2);
  db.close();
});

test('la recherche plein texte couvre le titre et les paroles, avec un filtre de langue/catégorie paramétré', (t) => {
  const db = openMigratedDatabase();
  const fts = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='chants_fts'").get();
  if (!fts) t.skip('FTS5 indisponible : le repli LIKE est couvert par le code applicatif.');
  insertChant(db, 'search-1', 'Lumière du matin', 'Nous chantons ensemble', 'louange');
  insertChant(db, 'search-2', 'Autre titre', 'Lumière sur le chemin', 'entree', 'soussou');
  const titleHits = db.prepare("SELECT c.id FROM chants_fts JOIN chants c ON c.rowid = chants_fts.rowid WHERE chants_fts MATCH ?").all('"lumière"*');
  assert.deepEqual(new Set(titleHits.map((row) => row.id)), new Set(['search-1', 'search-2']));
  const lyricHit = db.prepare("SELECT c.id FROM chants_fts JOIN chants c ON c.rowid = chants_fts.rowid WHERE chants_fts MATCH ?").all('"ensemble"*');
  assert.deepEqual(lyricHit.map((row) => row.id), ['search-1']);
  const filtered = db.prepare(`
    SELECT c.id FROM chants c
    JOIN chant_categories cc ON cc.chant_id = c.id
    WHERE c.language = ? AND cc.category_id = ?
  `).all('soussou', 'entree');
  assert.deepEqual(filtered.map((row) => row.id), ['search-2']);
  const injection = db.prepare("SELECT count(*) AS count FROM chants_fts WHERE chants_fts MATCH ?").get('" OR 1=1 --"');
  assert.equal(injection.count, 0);
  db.close();
});

test('les requêtes de recherche générées couvrent liste personnelle, filtres, tri, pagination et fallback LIKE', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'query-1', 'Chant zèbre', 'Paroles lumineuses', 'louange');
  insertChant(db, 'query-2', 'Chant alpha', 'Autres paroles', 'entree');
  db.prepare('UPDATE chants SET personal = 1 WHERE id = ?').run('query-1');

  const personalQueries = buildChantSearchQueries(
    { personalOnly: true, limit: 30, offset: 0 },
    false,
  );
  const personalRows = db.prepare(personalQueries.selectSql).all(...personalQueries.selectParams);
  assert.deepEqual(personalRows.map((row) => row.id), ['query-1']);
  assert.equal(db.prepare(personalQueries.countSql).get(...personalQueries.countParams).total, 1);

  const searchQueries = buildChantSearchQueries(
    { query: 'lumineuses', category: 'louange', preferredCategory: 'louange', preferredLanguage: 'fr', limit: 1 },
    false,
  );
  const searchRows = db.prepare(searchQueries.selectSql).all(...searchQueries.selectParams);
  assert.deepEqual(searchRows.map((row) => row.id), ['query-1']);
  assert.match(searchQueries.selectSql, /ORDER BY/);

  const secondPage = buildChantSearchQueries({ limit: 1, offset: 1 }, false);
  const pageRows = db.prepare(secondPage.selectSql).all(...secondPage.selectParams);
  assert.equal(pageRows.length, 1);
  assert.equal(pageRows[0].id, 'query-1');
  db.close();
});

test('les favoris, fichiers absents et références multimédia partagées sont persistés sans blob', () => {
  const db = openMigratedDatabase();
  insertChant(db, 'media-1', 'Chant avec média', 'Paroles');
  insertChant(db, 'media-2', 'Autre chant', 'Autres paroles');
  db.prepare(`
    INSERT INTO favorites (user_id, chant_id, created_at) VALUES (?, ?, ?)
  `).run('local', 'media-1', '2026-10-16');
  db.prepare(`
    INSERT INTO local_files (uri, file_type, name, availability, created_at, updated_at)
    VALUES (?, 'pdf', ?, 'missing', ?, ?)
  `).run('file:///missing.pdf', 'partition.pdf', '2026-10-16', '2026-10-16');
  const resource = db.prepare(`
    INSERT INTO chant_resources (id, chant_id, file_uri, resource_type, created_at) VALUES (?, ?, ?, 'pdf', ?)
  `);
  resource.run('resource-1', 'media-1', 'file:///missing.pdf', '2026-10-16');
  resource.run('resource-2', 'media-2', 'file:///missing.pdf', '2026-10-16');
  assert.equal(db.prepare('SELECT count(*) AS count FROM favorites WHERE user_id = ?').get('local').count, 1);
  assert.equal(db.prepare('SELECT availability FROM local_files WHERE uri = ?').get('file:///missing.pdf').availability, 'missing');
  db.prepare('DELETE FROM chant_resources WHERE id = ?').run('resource-1');
  assert.equal(db.prepare('SELECT count(*) AS count FROM chant_resources WHERE file_uri = ?').get('file:///missing.pdf').count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM local_files WHERE uri = ?').get('file:///missing.pdf').count, 1);
  db.close();
});

test('l’import refuse un fichier absent, le manque d’espace et propage les erreurs de copie', async () => {
  const operations = [];
  const adapter = {
    getInfo: async () => ({ exists: false, size: 50 }),
    getFreeSpace: async () => 10,
    ensureDirectory: async (path) => operations.push(['mkdir', path]),
    copy: async (from, to) => operations.push(['copy', from, to]),
  };
  const input = {
    sourceUri: 'cache://partition.pdf',
    documentDirectory: 'documents://',
    chantId: 'personal-1',
    resourceId: 'resource-1',
    fileName: 'partition.pdf',
  };

  await assert.rejects(
    copyIntoPersistentStorage(adapter, input),
    /introuvable/,
  );
  assert.equal(operations.length, 0);

  adapter.getInfo = async () => ({ exists: true, size: 50 });
  await assert.rejects(
    copyIntoPersistentStorage(adapter, input),
    /espace disponible est insuffisant/,
  );
  assert.equal(operations.length, 0);

  adapter.getFreeSpace = async () => 100;
  adapter.copy = async () => { throw new Error('I/O interrompu'); };
  await assert.rejects(copyIntoPersistentStorage(adapter, input), /I\/O interrompu/);
  assert.deepEqual(operations, [['mkdir', 'documents://mes-chants/personal-1/']]);
});

test('l’import de ressources valide les formats, tailles et noms de fichiers', () => {
  assert.equal(validateChantFile({ name: 'Piste soprano.M4A', mimeType: 'audio/mp4', size: 100, uri: 'content://audio' }, 'audio'), null);
  assert.equal(validateChantFile({ name: 'partition.pdf', mimeType: 'application/pdf', size: 100, uri: 'file://score' }, 'pdf'), null);
  assert.match(validateChantFile({ name: 'partition.exe', size: 100, uri: 'file://bad' }, 'pdf') ?? '', /Format accepté/);
  assert.match(validateChantFile({ name: 'trop-lourd.mp3', size: 104857601, uri: 'file://large' }, 'audio') ?? '', /100 Mo/);
  assert.equal(sanitizeResourceName('C:\\dossier\\ partition.pdf'), 'partition.pdf');
});

test('les requêtes indexées restent paginées avec 10 000 chants', { timeout: 15000 }, () => {
  const db = openMigratedDatabase();
  const insert = db.prepare(`
    INSERT INTO chants (id, title, lyrics, language, primary_category_id, legal_status, created_at, updated_at)
    VALUES (?, ?, ?, 'fr', 'entree', 'domaine_public', '2026-01-01', '2026-01-01')
  `);
  const start = performance.now();
  db.exec('BEGIN');
  for (let index = 0; index < 10_000; index += 1) {
    insert.run(`bulk-${index}`, `Chant numéro ${index}`, `Paroles de louange ${index}`);
  }
  db.exec('COMMIT');
  const insertDuration = performance.now() - start;
  const queryStart = performance.now();
  const page = db.prepare(`
    SELECT id, title FROM chants
    WHERE title LIKE ? COLLATE NOCASE
    ORDER BY title COLLATE NOCASE, id LIMIT ? OFFSET ?
  `).all('%chant numéro 99%', 30, 0);
  const queryDuration = performance.now() - queryStart;
  assert.ok(page.length > 0 && page.length <= 30);
  assert.ok(insertDuration < 10_000, `10 000 insertions took ${insertDuration.toFixed(0)} ms`);
  assert.ok(queryDuration < 1_000, `paged query took ${queryDuration.toFixed(0)} ms`);
  db.close();
});
