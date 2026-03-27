const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(__dirname, '../../data/dashboard.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Schema initialisation
db.exec(`
  CREATE TABLE IF NOT EXISTS metrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT    NOT NULL,
    value       TEXT    NOT NULL,
    unit        TEXT,
    change      TEXT,
    change_type TEXT    CHECK(change_type IN ('up', 'down', 'neutral')),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event       TEXT    NOT NULL,
    detail      TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default metrics if table is empty
const count = db.prepare('SELECT COUNT(*) AS cnt FROM metrics').get();
if (count.cnt === 0) {
  const insert = db.prepare(
    'INSERT INTO metrics (label, value, unit, change, change_type) VALUES (?, ?, ?, ?, ?)'
  );
  const seedMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  seedMany([
    ['Total Users',       '12,450', 'users', '+8.2%',  'up'],
    ['Monthly Revenue',   '48,302', 'USD',   '+12.5%', 'up'],
    ['Active Sessions',   '342',    '',      '-2.1%',  'down'],
    ['Avg Response Time', '145',    'ms',    '-5.3%',  'down'],
  ]);
  console.log('Database seeded with sample metrics.');
}

// Seed activity log if empty
const logCount = db.prepare('SELECT COUNT(*) AS cnt FROM activity_log').get();
if (logCount.cnt === 0) {
  const insertLog = db.prepare(
    'INSERT INTO activity_log (event, detail) VALUES (?, ?)'
  );
  const seedLog = db.transaction((rows) => {
    for (const row of rows) insertLog.run(...row);
  });
  seedLog([
    ['User signed up',     'john.doe@example.com'],
    ['Payment received',   '$299 – Pro Plan'],
    ['Server restarted',   'Scheduled maintenance'],
    ['New report generated', 'Q1 2026 Summary'],
    ['Alert resolved',     'High memory usage on node-02'],
  ]);
}

module.exports = db;
