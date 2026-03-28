const express = require('express');
const { getOrgInventoryStats } = require('../services/mist');

const router = express.Router();

// GET /api/inventory/stats
// Returns live device counts grouped by type (standalone switch, VC switch, AP)
// and connection status (connected / disconnected).
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getOrgInventoryStats();
    res.json(stats);
  } catch (err) {
    console.error('[Inventory] stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
