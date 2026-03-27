const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(__dirname, '../../data/dashboard.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let _db;

// Persist the in-memory DB to disk
function save() {
  const data = _db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Return all rows as plain objects
function all(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Return first row or null
function get(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

// Run INSERT / UPDATE / DELETE — returns { lastInsertRowid }
function run(sql, params = []) {
  _db.run(sql, params);
  const row = get('SELECT last_insert_rowid() AS id');
  return { lastInsertRowid: row ? row.id : null };
}

// Execute raw multi-statement SQL
function exec(sql) {
  _db.exec(sql);
}

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      label       TEXT    NOT NULL,
      value       TEXT    NOT NULL,
      unit        TEXT,
      change      TEXT,
      change_type TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event       TEXT    NOT NULL,
      detail      TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  save();
}

module.exports = { init, all, get, run, exec, save };
