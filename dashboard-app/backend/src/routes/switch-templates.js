const express = require('express');
const { createOrgNetworkTemplate, getOrgNetworkTemplate, updateOrgNetworkTemplate, deleteOrgNetworkTemplateNetworks, deleteOrgNetworkTemplate, updateOrgNetworkTemplatePortProfiles, deleteOrgNetworkTemplatePortProfiles } = require('../services/mist');

const router = express.Router();

// POST /api/switch-templates
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

// GET /api/switch-templates/:id/networks
// Returns all networks currently on the template as an array.
router.get('/:id/networks', async (req, res) => {
  const { id } = req.params;
  try {
    const template = await getOrgNetworkTemplate(process.env.MIST_ORG_ID, id);
    const networks = Object.entries(template.networks || {}).map(([name, v]) => ({
      name, vlan_id: v.vlan_id, subnet: v.subnet,
    }));
    res.json({ networks });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// PUT /api/switch-templates/:id/networks
// Body: { networks: [{ name, vlan_id, subnet }] } — merges into template.
router.put('/:id/networks', async (req, res) => {
  const { id } = req.params;
  const { networks } = req.body;
  if (!Array.isArray(networks) || networks.length === 0) {
    return res.status(400).json({ error: 'networks must be a non-empty array.' });
  }
  if (networks.length > 4000) {
    return res.status(400).json({ error: 'Cannot create more than 4000 networks at once.' });
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

// DELETE /api/switch-templates/:id/networks
// Body: { names: [string] } — removes named networks from template.
router.delete('/:id/networks', async (req, res) => {
  const { id } = req.params;
  const { names } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'names must be a non-empty array of network name strings.' });
  }
  try {
    const result = await deleteOrgNetworkTemplateNetworks(process.env.MIST_ORG_ID, id, names);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// DELETE /api/switch-templates/:id
// Deletes the entire org-level network template.
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteOrgNetworkTemplate(process.env.MIST_ORG_ID, id);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// GET /api/switch-templates/:id/port-profiles
// Returns the template's port_usages as an array.
router.get('/:id/port-profiles', async (req, res) => {
  const { id } = req.params;
  try {
    const template = await getOrgNetworkTemplate(process.env.MIST_ORG_ID, id);
    const profiles = Object.entries(template.port_usages || {}).map(([name, v]) => ({
      name, mode: v.mode, port_network: v.port_network, voip_network: v.voip_network,
    }));
    res.json({ profiles });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// PUT /api/switch-templates/:id/port-profiles
// Body: { profiles: [{ name, mode, port_network, voip_network, speed?, duplex?, mac_limit? }] }
// Merges port profiles into the template's port_usages.
router.put('/:id/port-profiles', async (req, res) => {
  const { id } = req.params;
  const { profiles } = req.body;

  if (!Array.isArray(profiles) || profiles.length === 0) {
    return res.status(400).json({ error: 'profiles must be a non-empty array.' });
  }

  const VALID_SPEEDS  = ['auto', '10', '100', '1000', '2500', '5000', '10000'];
  const VALID_DUPLEX  = ['auto', 'half', 'full'];

  const profilesMap = {};
  for (const p of profiles) {
    if (!p.name || !p.mode || !p.port_network || !p.voip_network) {
      return res.status(400).json({ error: 'Each profile must have name, mode, port_network, and voip_network.' });
    }
    if (!['trunk', 'access'].includes(p.mode)) {
      return res.status(400).json({ error: 'mode must be trunk or access.' });
    }
    if (p.speed  && !VALID_SPEEDS.includes(p.speed))  return res.status(400).json({ error: `Invalid speed value: ${p.speed}` });
    if (p.duplex && !VALID_DUPLEX.includes(p.duplex)) return res.status(400).json({ error: `Invalid duplex value: ${p.duplex}` });
    if (p.mac_limit !== undefined && (typeof p.mac_limit !== 'number' || p.mac_limit < 1 || p.mac_limit > 255)) {
      return res.status(400).json({ error: 'mac_limit must be a number between 1 and 255.' });
    }
    const entry = { mode: p.mode, port_network: p.port_network, voip_network: p.voip_network };
    if (p.speed     !== undefined) entry.speed     = p.speed;
    if (p.duplex    !== undefined) entry.duplex    = p.duplex;
    if (p.mac_limit !== undefined) entry.mac_limit = p.mac_limit;
    profilesMap[p.name] = entry;
  }

  try {
    const result = await updateOrgNetworkTemplatePortProfiles(process.env.MIST_ORG_ID, id, profilesMap);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

// DELETE /api/switch-templates/:id/port-profiles
// Body: { names: [string] } — removes named port profiles from template.
router.delete('/:id/port-profiles', async (req, res) => {
  const { id } = req.params;
  const { names } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'names must be a non-empty array of profile name strings.' });
  }
  try {
    const result = await deleteOrgNetworkTemplatePortProfiles(process.env.MIST_ORG_ID, id, names);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 502).json({ error: err.message });
  }
});

module.exports = router;
