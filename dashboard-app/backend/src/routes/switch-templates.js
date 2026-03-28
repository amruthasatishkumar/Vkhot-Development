const express = require('express');
const { createOrgNetworkTemplate, getOrgNetworkTemplate, updateOrgNetworkTemplate } = require('../services/mist');

const router = express.Router();

// POST /api/switch-templates
// Creates an org-level network template.
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Template name is required.' });
  }
  try {
    const result = await createOrgNetworkTemplate(process.env.MIST_ORG_ID, name.trim());
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// GET /api/switch-templates/:id
// Fetches template and attaches the canonical Mist API endpoint.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await getOrgNetworkTemplate(process.env.MIST_ORG_ID, id);
    result._apiEndpoint = `${process.env.MIST_BASE_URL}/api/v1/orgs/${process.env.MIST_ORG_ID}/networktemplates/${id}`;
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// PUT /api/switch-templates/:id/networks
// Body: { networks: [{ name, vlan_id, subnet }] }
// Merges the provided networks into the template.
router.put('/:id/networks', async (req, res) => {
  const { id } = req.params;
  const { networks } = req.body;

  if (!Array.isArray(networks) || networks.length === 0) {
    return res.status(400).json({ error: 'networks must be a non-empty array.' });
  }
  if (networks.length > 20) {
    return res.status(400).json({ error: 'Cannot create more than 20 networks at once.' });
  }

  const networksMap = {};
  for (const net of networks) {
    if (!net.name || typeof net.vlan_id !== 'number' || !net.subnet) {
      return res.status(400).json({ error: 'Each network must have name, vlan_id (number), and subnet.' });
    }
    networksMap[net.name] = { vlan_id: net.vlan_id, subnet: net.subnet };
  }

  try {
    const result = await updateOrgNetworkTemplate(process.env.MIST_ORG_ID, id, networksMap);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

module.exports = router;
