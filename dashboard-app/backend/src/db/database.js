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

  const count = get('SELECT COUNT(*) AS cnt FROM metrics');
  if (!count || count.cnt === 0) {
    const seeds = [
      ['Total Users',       '12,450', 'users', '+8.2%',  'up'],
      ['Monthly Revenue',   '48,302', 'USD',   '+12.5%', 'up'],
      ['Active Sessions',   '342',    '',      '-2.1%',  'down'],
      ['Avg Response Time', '145',    'ms',    '-5.3%',  'down'],
    ];
    for (const row of seeds) {
      run('INSERT INTO metrics (label, value, unit, change, change_type) VALUES (?,?,?,?,?)', row);
    }
    console.log('Database seeded with sample metrics.');
  }

  const logCount = get('SELECT COUNT(*) AS cnt FROM activity_log');
  if (!logCount || logCount.cnt === 0) {
    const logs = [
      ['User signed up',       'john.doe@example.com'],
      ['Payment received',     '$299 – Pro Plan'],
      ['Server restarted',     'Scheduled maintenance'],
      ['New report generated', 'Q1 2026 Summary'],
      ['Alert resolved',       'High memory usage on node-02'],
    ];
    for (const row of logs) {
      run('INSERT INTO activity_log (event, detail) VALUES (?,?)', row);
    }
  }

  save();
}

module.exports = { init, all, get, run, exec, save };
