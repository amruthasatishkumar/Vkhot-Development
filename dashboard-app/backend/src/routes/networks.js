const express = require('express');
const { findSwitchByMac, generateVlans, createNetworksOnDevice, removeAppVlansFromDevice, createPortProfilesOnDevice, removeAppPortProfilesFromDevice, assignPortProfilesToDownPorts, removeAppPortAssignmentsFromDevice, getDownPortsForBounce, bouncePortsOnce, listVirtualChassis } = require('../services/mist');

const router = express.Router();

// Accepts both AA:BB:CC:DD:EE:FF and AABBCCDDEEFF formats
const MAC_REGEX = /^([0-9a-fA-F]{2}[:\-]?){5}[0-9a-fA-F]{2}$/;

// GET /api/networks/debug — tests Mist connectivity and returns raw response info
router.get('/debug', async (_req, res) => {
  const BASE_URL  = (process.env.MIST_BASE_URL || '').replace(/\/$/, '');
  const API_TOKEN = process.env.MIST_API_TOKEN;
  const ORG_ID    = process.env.MIST_ORG_ID;

  if (!API_TOKEN || API_TOKEN === 'your_mist_api_token_here') {
    return res.status(500).json({ error: 'MIST_API_TOKEN not set' });
  }
  if (!ORG_ID || ORG_ID === 'your_org_id_here') {
    return res.status(500).json({ error: 'MIST_ORG_ID not set' });
  }

  const url = `${BASE_URL}/api/v1/orgs/${ORG_ID}/inventory`;
  try {
    const mistRes = await fetch(url, {
      headers: {
        'Authorization': `Token ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await mistRes.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    res.json({ url_called: url, http_status: mistRes.status, response: body });
  } catch (err) {
    res.status(500).json({ error: err.message, url_called: url });
  }
});

// POST /api/networks/provision
// Body: { mac: "AA:BB:CC:DD:EE:FF", count: 10 }
router.post('/provision', async (req, res) => {
  const { mac, count } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({
      error: 'Invalid MAC address format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.',
    });
  }

  const vlanCount = parseInt(count);
  if (!count || isNaN(vlanCount) || vlanCount < 1 || vlanCount > 4000) {
    return res.status(400).json({ error: 'count must be a number between 1 and 4000.' });
  }

  if (!process.env.MIST_API_TOKEN || process.env.MIST_API_TOKEN === 'your_mist_api_token_here') {
    return res.status(500).json({ error: 'MIST_API_TOKEN is not configured in .env' });
  }
  if (!process.env.MIST_ORG_ID || process.env.MIST_ORG_ID === 'your_org_id_here') {
    return res.status(500).json({ error: 'MIST_ORG_ID is not configured in .env' });
  }

  try {
    // 1. Find the switch in Mist inventory
    const device = await findSwitchByMac(mac.trim());

    // 2. Generate VLANs based on user-supplied count
    const vlans = generateVlans(vlanCount);

    // 3. Patch the VLANs directly onto the switch device config
    const created = await createNetworksOnDevice(device.site_id, device.id, vlans);

    res.json({
      switch: {
        mac:     device.mac,
        name:    device.name || 'Unnamed Switch',
        site_id: device.site_id,
      },
      created,
      failed: [],
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/networks/remove
// Body: { mac: "AA:BB:CC:DD:EE:FF" }
router.post('/remove', async (req, res) => {
  const { mac } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({
      error: 'Invalid MAC address format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.',
    });
  }

  try {
    const device = await findSwitchByMac(mac.trim());
    const { removed } = await removeAppVlansFromDevice(device.site_id, device.id);

    res.json({
      switch: {
        mac:  device.mac,
        name: device.name || 'Unnamed Switch',
      },
      removed,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/networks/bounce-discover — find all eligible down ports for bouncing
router.post('/bounce-discover', async (req, res) => {
  const { mac } = req.body;
  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({ error: 'Invalid or missing MAC address.' });
  }
  try {
    const device = await findSwitchByMac(mac.trim());
    const { ports } = await getDownPortsForBounce(device.site_id, device.id, device.mac);
    res.json({
      switch: { id: device.id, site_id: device.site_id, name: device.name || 'Unnamed Switch', mac: device.mac },
      ports,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/networks/bounce-once — bounce a specific list of ports once
router.post('/bounce-once', async (req, res) => {
  const { siteId, deviceId, portIds } = req.body;
  if (!siteId || !deviceId || !Array.isArray(portIds) || portIds.length === 0) {
    return res.status(400).json({ error: 'siteId, deviceId, and a non-empty portIds array are required.' });
  }
  try {
    await bouncePortsOnce(siteId, deviceId, portIds);
    res.json({ bounced: portIds.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/networks/virtual-chassis — list all VC devices in the org
router.get('/virtual-chassis', async (_req, res) => {
  try {
    const vcs = await listVirtualChassis();
    res.json({ count: vcs.length, virtualChassis: vcs });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/networks/vc-debug — raw diagnostic data for VC troubleshooting
router.get('/vc-debug', async (_req, res) => {
  const BASE_URL  = (process.env.MIST_BASE_URL  || '').replace(/\/$/, '');
  const API_TOKEN = process.env.MIST_API_TOKEN;
  const ORG_ID    = process.env.MIST_ORG_ID;
  const headers   = { 'Authorization': `Token ${API_TOKEN}`, 'Content-Type': 'application/json' };

  try {
    // 1. Org inventory — show first 5 switch entries with all their keys
    const invRes  = await fetch(`${BASE_URL}/api/v1/orgs/${ORG_ID}/inventory`, { headers });
    const inv     = await invRes.json();
    const switches = inv.filter((d) => d.type === 'switch');
    const siteIds  = [...new Set(switches.filter((d) => d.site_id).map((d) => d.site_id))];

    // 2. For the first site found, fetch raw site devices
    let siteDevicesSample = [];
    let siteDevicesKeys   = [];
    if (siteIds.length > 0) {
      const sdRes = await fetch(`${BASE_URL}/api/v1/sites/${siteIds[0]}/devices?type=switch`, { headers });
      const sd    = await sdRes.json();
      siteDevicesSample = (Array.isArray(sd) ? sd : sd.results || []).slice(0, 3).map((d) => ({
        name:       d.name,
        mac:        d.mac,
        type:       d.type,
        model:      d.model,
        vc_mac:     d.vc_mac,
        vc_role:    d.vc_role,
        vc_members: d.vc_members,
        // Show all top-level keys so we can find the right field name
        _keys: Object.keys(d),
      }));
      if (siteDevicesSample.length > 0) {
        siteDevicesKeys = Object.keys((Array.isArray(sd) ? sd[0] : (sd.results || [])[0]) || {});
      }
    }

    res.json({
      inventorySwitchCount: switches.length,
      siteIds,
      inventorySwitchSample: switches.slice(0, 3).map((d) => ({
        name:    d.name,
        mac:     d.mac,
        type:    d.type,
        model:   d.model,
        site_id: d.site_id,
        vc_mac:  d.vc_mac,
        vc_role: d.vc_role,
        _keys:   Object.keys(d),
      })),
      firstSiteId: siteIds[0] || null,
      siteDevicesSample,
      siteDevicesTopLevelKeys: siteDevicesKeys,
    });
  } catch (err) {
    res.status(502).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;

// ── Port Profiles ─────────────────────────────────────────────────────────────

// POST /api/networks/port-profiles
// Body: { mac, count, mode }
router.post('/port-profiles', async (req, res) => {
  const { mac, count, mode } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({ error: 'Invalid MAC address format.' });
  }

  const profileCount = parseInt(count);
  if (!count || isNaN(profileCount) || profileCount < 1 || profileCount > 100) {
    return res.status(400).json({ error: 'count must be a number between 1 and 100.' });
  }

  if (!mode || !['access', 'trunk'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "access" or "trunk".' });
  }

  try {
    const device  = await findSwitchByMac(mac.trim());
    const created = await createPortProfilesOnDevice(device.site_id, device.id, profileCount, mode);

    res.json({
      switch:  { mac: device.mac, name: device.name || 'Unnamed Switch', site_id: device.site_id },
      created,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404
                 : err.message.includes('Not enough') ? 422
                 : 502;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/networks/remove-profiles
// Body: { mac }
router.post('/remove-profiles', async (req, res) => {
  const { mac } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({ error: 'Invalid MAC address format.' });
  }

  try {
    const device         = await findSwitchByMac(mac.trim());
    const { removed }    = await removeAppPortProfilesFromDevice(device.site_id, device.id);

    res.json({
      switch:  { mac: device.mac, name: device.name || 'Unnamed Switch' },
      removed,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

// ── Port Profile Assignment ───────────────────────────────────────────────────

// POST /api/networks/assign-profiles
// Body: { mac, count }
router.post('/assign-profiles', async (req, res) => {
  const { mac, count } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({ error: 'Invalid MAC address format.' });
  }

  const assignCount = parseInt(count);
  if (!count || isNaN(assignCount) || assignCount < 1) {
    return res.status(400).json({ error: 'count must be a positive number.' });
  }

  try {
    const device = await findSwitchByMac(mac.trim());
    const { assigned, skipped } = await assignPortProfilesToDownPorts(device.site_id, device.id, device.mac, assignCount);

    res.json({
      switch:   { mac: device.mac, name: device.name || 'Unnamed Switch' },
      assigned,
      skipped,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404
                 : err.message.includes('Insufficient') ? 422
                 : err.message.includes('No app-created port profiles') ? 422
                 : 502;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/networks/remove-assignments
// Body: { mac }
router.post('/remove-assignments', async (req, res) => {
  const { mac } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({ error: 'Invalid MAC address format.' });
  }

  try {
    const device      = await findSwitchByMac(mac.trim());
    const { removed } = await removeAppPortAssignmentsFromDevice(device.site_id, device.id);

    res.json({
      switch:  { mac: device.mac, name: device.name || 'Unnamed Switch' },
      removed,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});
