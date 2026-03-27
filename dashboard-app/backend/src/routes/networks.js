const express = require('express');
const { findSwitchByMac, generateVlans, createNetworksOnDevice, removeAppVlansFromDevice } = require('../services/mist');

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

module.exports = router;
