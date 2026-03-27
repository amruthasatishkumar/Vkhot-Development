const express = require('express');
const db = require('../db/database');

const router = express.Router();

// ── Metrics ──────────────────────────────────────────────────────────────────

// GET /api/metrics
router.get('/metrics', (_req, res) => {
  const rows = db.all('SELECT * FROM metrics ORDER BY id ASC');
  res.json(rows);
});

// POST /api/metrics
router.post('/metrics', (req, res) => {
  const { label, value, unit, change, change_type } = req.body;
  if (!label || value === undefined) {
    return res.status(400).json({ error: 'label and value are required' });
  }
  const info = db.run(
    'INSERT INTO metrics (label, value, unit, change, change_type) VALUES (?,?,?,?,?)',
    [label, String(value), unit ?? null, change ?? null, change_type ?? 'neutral']
  );
  db.save();
  const created = db.get('SELECT * FROM metrics WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(created);
});

// PUT /api/metrics/:id
router.put('/metrics/:id', (req, res) => {
  const { label, value, unit, change, change_type } = req.body;
  const existing = db.get('SELECT id FROM metrics WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Metric not found' });

  db.run(
    'UPDATE metrics SET label=?, value=?, unit=?, change=?, change_type=? WHERE id=?',
    [label, String(value), unit ?? null, change ?? null, change_type ?? 'neutral', req.params.id]
  );
  db.save();
  const updated = db.get('SELECT * FROM metrics WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/metrics/:id
router.delete('/metrics/:id', (req, res) => {
  const existing = db.get('SELECT id FROM metrics WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Metric not found' });

  db.run('DELETE FROM metrics WHERE id = ?', [req.params.id]);
  db.save();
  res.status(204).end();
});

// ── Activity Log ─────────────────────────────────────────────────────────────

// GET /api/activity
router.get('/activity', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows = db.all('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]);
  res.json(rows);
});

// POST /api/activity
router.post('/activity', (req, res) => {
  const { event, detail } = req.body;
  if (!event) return res.status(400).json({ error: 'event is required' });
  const info = db.run(
    'INSERT INTO activity_log (event, detail) VALUES (?,?)',
    [event, detail ?? null]
  );
  db.save();
  const created = db.get('SELECT * FROM activity_log WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(created);
});

module.exports = router;
