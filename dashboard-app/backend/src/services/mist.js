// Trim whitespace and any accidental quotes from .env values
const BASE_URL  = (process.env.MIST_BASE_URL  || 'https://api.mist.com').trim().replace(/['"]/g, '').replace(/\/$/, '');
const API_TOKEN = (process.env.MIST_API_TOKEN || '').trim().replace(/['"]/g, '');
const ORG_ID    = (process.env.MIST_ORG_ID    || '').trim().replace(/['"]/g, '');

function mistHeaders() {
  return {
    'Authorization': `Token ${API_TOKEN}`,
    'Content-Type':  'application/json',
  };
}

/**
 * Normalise MAC to lowercase no-separator format for comparison
 * e.g. "AA:BB:CC:DD:EE:FF" → "aabbccddeeff"
 */
function normaliseMac(mac) {
  return mac.replace(/[:\-\.]/g, '').toLowerCase();
}

/**
 * Validate the API token works by calling /api/v1/self
 */
async function validateToken() {
  const url = `${BASE_URL}/api/v1/self`;
  const res = await fetch(url, { headers: mistHeaders() });
  if (res.status === 401) throw new Error('MIST_API_TOKEN is invalid or expired (401 Unauthorized)');
  if (res.status === 403) throw new Error('MIST_API_TOKEN does not have permission to access this org (403 Forbidden)');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mist token validation failed (${res.status}): ${body}`);
  }
}

/**
 * Find a switch in the org inventory by its MAC address.
 * Returns { id, mac, site_id, name } or throws if not found.
 */
async function findSwitchByMac(mac) {
  // Validate token first — gives a clearer error than a 404 on inventory
  await validateToken();

  const url = `${BASE_URL}/api/v1/orgs/${ORG_ID}/inventory`;
  console.log(`[Mist] GET ${url}`);

  const res = await fetch(url, { headers: mistHeaders() });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Mist] Inventory lookup failed: ${res.status}`, body);
    if (res.status === 404) {
      throw new Error(`Org not found — check MIST_ORG_ID is correct (got 404 for org: ${ORG_ID})`);
    }
    throw new Error(`Mist inventory lookup failed (${res.status}): ${body}`);
  }

  const devices = await res.json();
  console.log(`[Mist] Inventory returned ${devices.length} device(s)`);

  const target = normaliseMac(mac);
  const found  = devices.find((d) => normaliseMac(d.mac || '') === target);

  if (!found) {
    throw new Error(`Switch with MAC ${mac} not found in org inventory`);
  }
  if (!found.site_id) {
    throw new Error(`Switch ${mac} exists but is not assigned to a site`);
  }

  return found;
}

/**
 * Generate N unique random VLANs (id 100–999).
 */
function generateVlans(count = 5) {
  const ids = new Set();
  while (ids.size < count) {
    ids.add(Math.floor(Math.random() * 4094) + 1); // 1–4094
  }

  return Array.from(ids).map((vlanId) => {
    const a = Math.floor(Math.random() * 254) + 1;
    const b = Math.floor(Math.random() * 254) + 1;
    return {
      name:    `VLAN_${vlanId}`,
      vlan_id: vlanId,
      subnet:  `10.${a}.${b}.0/24`,
    };
  });
}

/**
 * Create 5 VLANs directly on a specific switch device by patching its config.
 * Fetches the current device config, merges new networks in, then PUTs it back.
 */
async function createNetworksOnDevice(siteId, deviceId, vlans) {
  // 1. Get current device config
  const getUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] GET ${getUrl}`);
  const getRes = await fetch(getUrl, { headers: mistHeaders() });
  if (!getRes.ok) {
    const body = await getRes.text();
    throw new Error(`Failed to fetch device config (${getRes.status}): ${body}`);
  }
  const deviceConfig = await getRes.json();

  // 2. Merge new VLANs into the device's networks map
  const existingNetworks = deviceConfig.networks || {};
  const newNetworks = { ...existingNetworks };
  for (const vlan of vlans) {
    newNetworks[vlan.name] = {
      vlan_id: String(vlan.vlan_id),
      subnet:  vlan.subnet,
    };
  }

  // 3. PUT updated config back to the device
  const putUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] PUT ${putUrl} with ${vlans.length} new networks`);
  const putRes = await fetch(putUrl, {
    method:  'PUT',
    headers: mistHeaders(),
    body:    JSON.stringify({ ...deviceConfig, networks: newNetworks }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to update device networks (${putRes.status}): ${body}`);
  }

  const updated = await putRes.json();

  // Return only the newly added VLANs for display
  return vlans.map((v) => ({
    vlan_id: v.vlan_id,
    name:    v.name,
    subnet:  v.subnet,
  }));
}

const APP_VLAN_PATTERN = /^VLAN_\d+$/;

/**
 * Remove all app-created VLANs (matching VLAN_<number>) from a switch device.
 * Returns { removed } count.
 */
async function removeAppVlansFromDevice(siteId, deviceId) {
  const getUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] GET ${getUrl}`);
  const getRes = await fetch(getUrl, { headers: mistHeaders() });
  if (!getRes.ok) {
    const body = await getRes.text();
    throw new Error(`Failed to fetch device config (${getRes.status}): ${body}`);
  }
  const deviceConfig = await getRes.json();

  const existingNetworks = deviceConfig.networks || {};
  const toRemove = Object.keys(existingNetworks).filter((k) => APP_VLAN_PATTERN.test(k));

  if (toRemove.length === 0) {
    return { removed: 0 };
  }

  const cleanedNetworks = { ...existingNetworks };
  for (const key of toRemove) delete cleanedNetworks[key];

  console.log(`[Mist] Removing ${toRemove.length} VLANs from device ${deviceId}`);
  const putRes = await fetch(`${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`, {
    method:  'PUT',
    headers: mistHeaders(),
    body:    JSON.stringify({ ...deviceConfig, networks: cleanedNetworks }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to update device (${putRes.status}): ${body}`);
  }

  return { removed: toRemove.length };
}

module.exports = { findSwitchByMac, generateVlans, createNetworksOnDevice, removeAppVlansFromDevice };
