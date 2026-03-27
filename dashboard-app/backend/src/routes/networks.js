const express = require('express');
const { findSwitchByMac, generateVlans, createNetwork } = require('../services/mist');

const router = express.Router();

// Accepts both AA:BB:CC:DD:EE:FF and AABBCCDDEEFF formats
const MAC_REGEX = /^([0-9a-fA-F]{2}[:\-]?){5}[0-9a-fA-F]{2}$/;

// POST /api/networks/provision
// Body: { mac: "AA:BB:CC:DD:EE:FF" }
router.post('/provision', async (req, res) => {
  const { mac } = req.body;

  if (!mac || !MAC_REGEX.test(mac.trim())) {
    return res.status(400).json({
      error: 'Invalid MAC address format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.',
    });
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

    // 2. Generate 5 unique random VLANs
    const vlans = generateVlans(5);

    // 3. Create all 5 networks in parallel
    const results = await Promise.allSettled(
      vlans.map((vlan) => createNetwork(device.site_id, vlan))
    );

    const created = [];
    const failed  = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      } else {
        failed.push({ vlan: vlans[i].name, reason: result.reason?.message });
      }
    });

    res.json({
      switch: {
        mac:     device.mac,
        name:    device.name || 'Unnamed Switch',
        site_id: device.site_id,
      },
      created,
      failed,
    });
  } catch (err) {
    // Switch not found or Mist API error
    const status = err.message.includes('not found') ? 404 : 502;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
