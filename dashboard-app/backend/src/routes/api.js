const express = require('express');
const db = require('../db/database');

const router = express.Router();

// ── Metrics ──────────────────────────────────────────────────────────────────

// GET /api/metrics  – return all metric cards
router.get('/metrics', (_req, res) => {
  const rows = db.prepare('SELECT * FROM metrics ORDER BY id ASC').all();
  res.json(rows);
});

// POST /api/metrics  – create a new metric
router.post('/metrics', (req, res) => {
  const { label, value, unit, change, change_type } = req.body;
  if (!label || value === undefined) {
    return res.status(400).json({ error: 'label and value are required' });
  }
  const stmt = db.prepare(
    'INSERT INTO metrics (label, value, unit, change, change_type) VALUES (?, ?, ?, ?, ?)'
  );
  const info = stmt.run(label, String(value), unit ?? null, change ?? null, change_type ?? 'neutral');
  const created = db.prepare('SELECT * FROM metrics WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/metrics/:id  – update a metric
router.put('/metrics/:id', (req, res) => {
  const { label, value, unit, change, change_type } = req.body;
  const existing = db.prepare('SELECT id FROM metrics WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Metric not found' });

  db.prepare(
    `UPDATE metrics SET label = ?, value = ?, unit = ?, change = ?, change_type = ?
     WHERE id = ?`
  ).run(label, String(value), unit ?? null, change ?? null, change_type ?? 'neutral', req.params.id);

  const updated = db.prepare('SELECT * FROM metrics WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/metrics/:id
router.delete('/metrics/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM metrics WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Metric not found' });

  db.prepare('DELETE FROM metrics WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ── Activity Log ─────────────────────────────────────────────────────────────

// GET /api/activity  – return recent activity (default: last 20)
router.get('/activity', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows = db.prepare(
    'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
  res.json(rows);
});

// POST /api/activity  – log a new event
router.post('/activity', (req, res) => {
  const { event, detail } = req.body;
  if (!event) return res.status(400).json({ error: 'event is required' });
  const stmt = db.prepare('INSERT INTO activity_log (event, detail) VALUES (?, ?)');
  const info = stmt.run(event, detail ?? null);
  const created = db.prepare('SELECT * FROM activity_log WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

module.exports = router;
