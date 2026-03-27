const BASE_URL = (process.env.MIST_BASE_URL || 'https://api.mist.com').replace(/\/$/, '');
const API_TOKEN = process.env.MIST_API_TOKEN;
const ORG_ID    = process.env.MIST_ORG_ID;

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
 * Find a switch in the org inventory by its MAC address.
 * Returns { id, mac, site_id, name } or throws if not found.
 */
async function findSwitchByMac(mac) {
  const url = `${BASE_URL}/api/v1/orgs/${ORG_ID}/inventory?type=switch`;
  const res = await fetch(url, { headers: mistHeaders() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mist inventory lookup failed (${res.status}): ${body}`);
  }

  const devices = await res.json();
  const target   = normaliseMac(mac);
  const found    = devices.find((d) => normaliseMac(d.mac || '') === target);

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
    ids.add(Math.floor(Math.random() * 900) + 100); // 100–999
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
 * Create a single network (VLAN) on a Mist site.
 * Returns the created network object from Mist.
 */
async function createNetwork(siteId, vlan) {
  const url = `${BASE_URL}/api/v1/sites/${siteId}/networks`;
  const res = await fetch(url, {
    method:  'POST',
    headers: mistHeaders(),
    body:    JSON.stringify(vlan),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create network ${vlan.name} (${res.status}): ${body}`);
  }

  return res.json();
}

module.exports = { findSwitchByMac, generateVlans, createNetwork };
