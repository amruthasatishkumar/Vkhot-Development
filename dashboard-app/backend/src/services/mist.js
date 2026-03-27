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

module.exports = { findSwitchByMac, generateVlans, createNetworksOnDevice, removeAppVlansFromDevice, createPortProfilesOnDevice, removeAppPortProfilesFromDevice, assignPortProfilesToDownPorts, removeAppPortAssignmentsFromDevice };

const APP_PROFILE_PATTERN = /^PROFILE_\d+$/;

/**
 * Create N port profiles on a switch using existing VLAN_XXX networks.
 * Each profile randomly picks 2 distinct VLANs — one for port_network, one for voip_network.
 */
async function createPortProfilesOnDevice(siteId, deviceId, count, mode) {
  const getUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] GET ${getUrl}`);
  const getRes = await fetch(getUrl, { headers: mistHeaders() });
  if (!getRes.ok) {
    const body = await getRes.text();
    throw new Error(`Failed to fetch device config (${getRes.status}): ${body}`);
  }
  const deviceConfig = await getRes.json();

  // Find all VLAN_XXX networks already on the device
  const existingNetworks = deviceConfig.networks || {};
  const appVlans = Object.keys(existingNetworks).filter((k) => /^VLAN_\d+$/.test(k));

  if (appVlans.length < 2) {
    throw new Error(
      `Not enough app-created networks on this device (found ${appVlans.length}). Create at least 2 VLANs first.`
    );
  }

  // Generate unique profile IDs (3-digit numbers)
  const profileIds = new Set();
  while (profileIds.size < count) {
    profileIds.add(Math.floor(Math.random() * 900) + 100); // 100–999
  }

  const existingProfiles = deviceConfig.port_usages || {};
  const newProfiles = { ...existingProfiles };
  const created = [];

  for (const profileId of profileIds) {
    // Pick 2 distinct random VLANs for port_network and voip_network
    const shuffled = [...appVlans].sort(() => Math.random() - 0.5);
    const portNetwork = shuffled[0];
    const voipNetwork = shuffled[1];

    const profileName = `PROFILE_${profileId}`;
    newProfiles[profileName] = {
      mode,
      port_network: portNetwork,
      voip_network: voipNetwork,
      all_networks: false,
    };

    created.push({ name: profileName, mode, port_network: portNetwork, voip_network: voipNetwork });
  }

  console.log(`[Mist] PUT ${getUrl} with ${count} new port profiles`);
  const putRes = await fetch(getUrl, {
    method:  'PUT',
    headers: mistHeaders(),
    body:    JSON.stringify({ ...deviceConfig, port_usages: newProfiles }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to update device port profiles (${putRes.status}): ${body}`);
  }

  return created;
}

/**
 * Assign PROFILE_XXX port profiles to `count` valid down ports on a switch.
 * Valid = down + not VCP (port_id doesn't start with "vcp") + not already assigned.
 * Also skips uplink ports (port_config entry with usage === "uplink").
 * Throws "Insufficient Port IDs" if count > valid eligible pool.
 */
async function assignPortProfilesToDownPorts(siteId, deviceId, deviceMac, count) {
  // 1. Get live port stats using the switch_ports search endpoint.
  //    Returns paginated { results: [{ port_id, up, ... }] }
  const normalizedMac = normaliseMac(deviceMac);
  const statsUrl = `${BASE_URL}/api/v1/sites/${siteId}/stats/switch_ports/search?mac=${normalizedMac}&limit=200`;
  console.log(`[Mist] GET ${statsUrl}`);
  const statsRes = await fetch(statsUrl, { headers: mistHeaders() });
  if (!statsRes.ok) {
    const body = await statsRes.text();
    throw new Error(`Failed to fetch port stats (${statsRes.status}): ${body}`);
  }
  const statsData = await statsRes.json();
  const portStats = statsData.results || [];

  if (portStats.length === 0) {
    throw new Error('No port stats available for this device. The switch may be offline or not reporting stats.');
  }

  // 2. Get current device config
  const deviceUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] GET ${deviceUrl}`);
  const deviceRes = await fetch(deviceUrl, { headers: mistHeaders() });
  if (!deviceRes.ok) {
    const body = await deviceRes.text();
    throw new Error(`Failed to fetch device config (${deviceRes.status}): ${body}`);
  }
  const deviceConfig = await deviceRes.json();

  // 3. Read PROFILE_XXX names from the device
  const existingProfiles = deviceConfig.port_usages || {};
  const appProfiles = Object.keys(existingProfiles).filter((k) => APP_PROFILE_PATTERN.test(k));
  if (appProfiles.length === 0) {
    throw new Error('No app-created port profiles found on this device. Create port profiles first.');
  }

  // 4. Build eligible port pool
  //    - port is down (up === false)
  //    - port_id does NOT start with "vcp" (Virtual Chassis Port)
  //    - existing port_config entry for this port does NOT have usage === "uplink"
  //    - port has NO existing usage set (unassigned)
  const existingPortConfig = deviceConfig.port_config || {};
  const downPorts = portStats.filter((p) => p.up === false);

  const eligible = downPorts.filter((p) => {
    const id = p.port_id;
    if (!id || id.toLowerCase().startsWith('vcp')) return false; // skip VCP
    const existing = existingPortConfig[id];
    if (existing && existing.usage === 'uplink') return false;   // skip uplink
    if (existing && existing.usage) return false;                // skip already assigned
    return true;
  });

  console.log(`[Mist] Down ports: ${downPorts.length}, Eligible: ${eligible.length}, Requested: ${count}`);

  if (count > eligible.length) {
    throw new Error(
      `Insufficient Port IDs on this model — only ${eligible.length} valid down port${eligible.length !== 1 ? 's' : ''} available, but ${count} requested.`
    );
  }

  // 5. Randomly shuffle eligible ports and pick `count` of them
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // 6. Assign a random PROFILE_XXX to each selected port
  const newPortConfig = { ...existingPortConfig };
  const assigned = [];
  for (const port of selected) {
    const profile = appProfiles[Math.floor(Math.random() * appProfiles.length)];
    newPortConfig[port.port_id] = { usage: profile };
    assigned.push({ port_id: port.port_id, profile });
  }

  // 7. PUT updated config
  console.log(`[Mist] PUT ${deviceUrl} — assigning profiles to ${assigned.length} ports`);
  const putRes = await fetch(deviceUrl, {
    method:  'PUT',
    headers: mistHeaders(),
    body:    JSON.stringify({ ...deviceConfig, port_config: newPortConfig }),
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to update device port_config (${putRes.status}): ${body}`);
  }

  const skipped = downPorts.length - eligible.length;
  return { assigned, skipped };
}

/**
 * Remove all app-created port profile assignments from port_config.
 * Clears any port_config entry whose usage matches /^PROFILE_\d+$/.
 */
async function removeAppPortAssignmentsFromDevice(siteId, deviceId) {
  const deviceUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  const getRes = await fetch(deviceUrl, { headers: mistHeaders() });
  if (!getRes.ok) {
    const body = await getRes.text();
    throw new Error(`Failed to fetch device config (${getRes.status}): ${body}`);
  }
  const deviceConfig = await getRes.json();

  const existingPortConfig = deviceConfig.port_config || {};
  const toRemove = Object.keys(existingPortConfig).filter(
    (k) => APP_PROFILE_PATTERN.test(existingPortConfig[k]?.usage || '')
  );

  if (toRemove.length === 0) return { removed: 0 };

  const cleaned = { ...existingPortConfig };
  for (const key of toRemove) delete cleaned[key];

  console.log(`[Mist] Removing profile assignments from ${toRemove.length} ports on device ${deviceId}`);
  const putRes = await fetch(deviceUrl, {
    method:  'PUT',
    headers: mistHeaders(),
    body:    JSON.stringify({ ...deviceConfig, port_config: cleaned }),
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to update device (${putRes.status}): ${body}`);
  }

  return { removed: toRemove.length };
}

/**
 * Remove all app-created port profiles (matching PROFILE_<number>) from a switch device.
 */
async function removeAppPortProfilesFromDevice(siteId, deviceId) {
  const getUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  const getRes = await fetch(getUrl, { headers: mistHeaders() });
  if (!getRes.ok) {
    const body = await getRes.text();
    throw new Error(`Failed to fetch device config (${getRes.status}): ${body}`);
  }
  const deviceConfig = await getRes.json();

  const existingProfiles = deviceConfig.port_usages || {};
  const toRemove = Object.keys(existingProfiles).filter((k) => APP_PROFILE_PATTERN.test(k));

  if (toRemove.length === 0) return { removed: 0 };

  const cleanedProfiles = { ...existingProfiles };
  for (const key of toRemove) delete cleanedProfiles[key];

  console.log(`[Mist] Removing ${toRemove.length} port profiles from device ${deviceId}`);
  const putRes = await fetch(getUrl, {
    method:  'PUT',
    headers: mistHeaders(),
    body:    JSON.stringify({ ...deviceConfig, port_usages: cleanedProfiles }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to update device (${putRes.status}): ${body}`);
  }

  return { removed: toRemove.length };
}
