require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { init } = require('./db/database');

// Validate critical env vars at startup
const requiredEnv = ['MIST_API_TOKEN', 'MIST_ORG_ID', 'MIST_SITE_ID'];
for (const key of requiredEnv) {
  if (!process.env[key] || process.env[key].trim() === '') {
    console.warn(`[WARN] ${key} is not set in .env — Mist API features will not work.`);
  }
}

// Enforce HTTPS for Mist base URL
const mistBase = process.env.MIST_BASE_URL || '';
if (mistBase && !mistBase.startsWith('https://')) {
  console.error('[ERROR] MIST_BASE_URL must use HTTPS. Exiting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3003;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN }));
// Limit request body to 100kb to prevent large payload attacks
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialise DB first, then mount routes and start listening
init()
  .then(() => {
    const apiRoutes             = require('./routes/api');
    const networkRoutes         = require('./routes/networks');
    const switchTemplateRoutes  = require('./routes/switch-templates');
    const inventoryRoutes       = require('./routes/inventory');
    app.use('/api', apiRoutes);
    app.use('/api/networks', networkRoutes);
    app.use('/api/switch-templates', switchTemplateRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
