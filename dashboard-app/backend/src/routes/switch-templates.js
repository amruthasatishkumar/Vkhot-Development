const express = require('express');
const { createOrgNetworkTemplate, getOrgNetworkTemplate } = require('../services/mist');

const router = express.Router();

// POST /api/switch-templates
// Body: { name: string }
// Creates an org-level network template via the Mist API.
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Template name is required.' });
  }

  try {
    const result = await createOrgNetworkTemplate(process.env.MIST_ORG_ID, name.trim());
    res.json(result);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/switch-templates/:id
// Fetches an org-level network template by ID.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await getOrgNetworkTemplate(process.env.MIST_ORG_ID, id);
    res.json(result);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
