// Trim whitespace and any accidental quotes from .env values
const BASE_URL  = (process.env.MIST_BASE_URL  || 'https://api.mist.com').trim().replace(/['"]/g, '').replace(/\/$/, '');
const API_TOKEN = (process.env.MIST_API_TOKEN || '').trim().replace(/['"]/g, '');
const ORG_ID    = (process.env.MIST_ORG_ID    || '').trim().replace(/['"]/g, '');
const SITE_ID   = (process.env.MIST_SITE_ID   || '').trim().replace(/['"]/g, '');

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

/**
 * Get all eligible down ports for bouncing on a switch.
 * Same filtering as assignPortProfilesToDownPorts:
 *   - port is down (up === false)
 *   - port_id does NOT start with "vcp"
 *   - port does NOT have usage === 'uplink'
 *   - port does NOT have any existing usage assignment
 * Returns { switchInfo: { name, mac }, ports: [{ port_id }] }
 */
async function getDownPortsForBounce(siteId, deviceId, deviceMac) {
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
    return { ports: [] };
  }

  const deviceUrl = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] GET ${deviceUrl}`);
  const deviceRes = await fetch(deviceUrl, { headers: mistHeaders() });
  if (!deviceRes.ok) {
    const body = await deviceRes.text();
    throw new Error(`Failed to fetch device config (${deviceRes.status}): ${body}`);
  }
  const deviceConfig = await deviceRes.json();
  const existingPortConfig = deviceConfig.port_config || {};

  const downPorts = portStats.filter((p) => p.up === false);
  const eligible = downPorts.filter((p) => {
    const id = p.port_id;
    if (!id || id.toLowerCase().startsWith('vcp')) return false;
    const existing = existingPortConfig[id];
    if (existing && existing.usage === 'uplink') return false;
    if (existing && existing.usage) return false;
    return true;
  });

  return {
    ports: eligible.map((p) => ({ port_id: p.port_id })),
  };
}

/**
 * Bounce (disable/re-enable) a list of ports on a switch via the Mist bounce_port API.
 * portIds: string[] e.g. ['ge-0/0/0', 'ge-0/0/1']
 */
async function bouncePortsOnce(siteId, deviceId, portIds) {
  const url = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}/bounce_port`;
  console.log(`[Mist] POST ${url} — bouncing ${portIds.length} ports`);
  const res = await fetch(url, {
    method:  'POST',
    headers: mistHeaders(),
    body:    JSON.stringify({ ports: portIds }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bounce port failed (${res.status}): ${body}`);
  }
  // Mist may return 200 with empty body or JSON
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * List all Virtual Chassis devices in the org.
 * Groups VC members by vc_mac, sorted master → backup → linecard.
 * Returns [{ vc_mac, members: [{ id, mac, name, model, vc_role, serial, site_id, status }] }]
 */
async function listVirtualChassis() {
  await validateToken();

  // Use ?vc=true to get only VC member devices from org inventory.
  // Each entry represents one VC member with vc_mac (shared chassis MAC) and vc_role.
  const invUrl = `${BASE_URL}/api/v1/orgs/${ORG_ID}/inventory?vc=true&limit=1000&page=1`;
  console.log(`[Mist] GET ${invUrl}`);
  const invRes = await fetch(invUrl, { headers: mistHeaders() });
  if (!invRes.ok) {
    const body = await invRes.text();
    throw new Error(`Mist VC inventory lookup failed (${invRes.status}): ${body}`);
  }
  const inventory = await invRes.json();
  console.log(`[Mist] VC inventory returned ${inventory.length} member entries`);

  if (!Array.isArray(inventory) || !inventory.length) return [];

  const roleOrder = { master: 0, backup: 1, linecard: 2, unknown: 3 };

  // Separate virtual chassis entries (mac === vc_mac) from physical members.
  // The virtual chassis entry holds the device id needed for the /stats call.
  const vcDeviceMap = {};   // vc_mac → { id, site_id, name } from the virtual chassis entry
  const physicalMembers = [];

  for (const d of inventory) {
    if (!d.vc_mac || !d.vc_mac.trim()) continue;
    if (normaliseMac(d.mac) === normaliseMac(d.vc_mac)) {
      // This IS the virtual chassis logical device — save its id and site_id
      vcDeviceMap[normaliseMac(d.vc_mac)] = {
        id:      d.id      || '',
        site_id: d.site_id || SITE_ID,
        name:    d.name    || '',
      };
    } else {
      // This is a real physical member
      physicalMembers.push(d);
    }
  }

  console.log(`[Mist] Physical VC members: ${physicalMembers.length}, VC device entries: ${Object.keys(vcDeviceMap).length}`);
  if (!physicalMembers.length) return [];

  // Group physical members by vc_mac
  const vcMap = new Map();
  for (const d of physicalMembers) {
    const chassisMac = normaliseMac(d.vc_mac);
    if (!chassisMac) continue;
    if (!vcMap.has(chassisMac)) {
      const vcDev = vcDeviceMap[chassisMac] || {};
      vcMap.set(chassisMac, {
        vc_mac:    chassisMac,
        name:      d.vc_name || vcDev.name || d.name || 'Unnamed VC',
        site_id:   vcDev.site_id || d.site_id || SITE_ID,
        device_id: vcDev.id || '',   // ID of the VC logical device for /stats call
        members:   [],
      });
    }
    const entry = vcMap.get(chassisMac);
    if (d.vc_name && entry.name === 'Unnamed VC') entry.name = d.vc_name;
    if (d.site_id && !entry.site_id) entry.site_id = d.site_id;

    entry.members.push({
      mac:     d.mac    || '',
      name:    d.name   || '—',
      model:   d.model  || 'Unknown',
      vc_role: (d.vc_role || 'unknown').toLowerCase(),
      serial:  d.serial || '',
      site_id: d.site_id || SITE_ID,
      status:  'unknown',   // enriched below from module_stat
    });
  }

  // Enrich member status + roles via parallel calls on each VC logical device.
  // - GET /sites/{site_id}/devices/{device_id}        → virtual_chassis.members[].vc_role
  // - GET /sites/{site_id}/stats/devices/{device_id}  → module_stat[].status
  await Promise.all([...vcMap.values()].map(async (vc) => {
    if (!vc.device_id || !vc.site_id) {
      console.warn(`[Mist] No device_id or site_id for VC ${vc.vc_mac} — status will be unknown`);
      return;
    }
    try {
      // ── Fetch device config to get actual vc_roles ─────────────────────
      const deviceUrl = `${BASE_URL}/api/v1/sites/${vc.site_id}/devices/${vc.device_id}`;
      console.log(`[Mist] GET ${deviceUrl} (role enrichment)`);
      const deviceRes = await fetch(deviceUrl, { headers: mistHeaders() });
      if (deviceRes.ok) {
        const deviceData = await deviceRes.json();
        const vcMembers = deviceData.virtual_chassis && Array.isArray(deviceData.virtual_chassis.members)
          ? deviceData.virtual_chassis.members
          : [];
        const roleByMac = {};
        for (const m of vcMembers) {
          if (m.mac) roleByMac[normaliseMac(m.mac)] = (m.vc_role || 'unknown').toLowerCase();
        }
        for (const member of vc.members) {
          const role = roleByMac[normaliseMac(member.mac)];
          if (role) member.vc_role = role;
        }
        console.log(`[Mist] Role enrichment for VC ${vc.vc_mac}:`, vc.members.map(m => `${m.mac}=${m.vc_role}`));
      } else {
        console.warn(`[Mist] devices ${deviceRes.status} for VC ${vc.vc_mac} — roles stay as inventory values`);
      }

      const statsUrl = `${BASE_URL}/api/v1/sites/${vc.site_id}/stats/devices/${vc.device_id}`;
      console.log(`[Mist] GET ${statsUrl}`);
      const statsRes = await fetch(statsUrl, { headers: mistHeaders() });
      if (!statsRes.ok) {
        console.warn(`[Mist] stats/devices ${statsRes.status} for VC ${vc.vc_mac}`);
        return;
      }
      const statsData = await statsRes.json();
      const moduleStat = Array.isArray(statsData.module_stat) ? statsData.module_stat : [];
      // Log first module_stat entry so we can see its actual field names
      if (moduleStat.length > 0) {
        console.log(`[Mist] module_stat[0] sample:`, JSON.stringify(moduleStat[0]));
      }
      console.log(`[Mist] module_stat entries: ${moduleStat.length} for VC ${vc.vc_mac}`);

      // Build mac → status lookup from module_stat.
      // Mist may use 'mac', 'fpc_mac', or serial/idx — try all known fields.
      const liveStatus = {};
      for (const m of moduleStat) {
        const mac = m.mac || m.fpc_mac || m.board_mac || '';
        let s = null;
        if      (m.status === 'connected'    || m.status === 'online')  s = 'connected';
        else if (m.status === 'disconnected' || m.status === 'offline') s = 'disconnected';
        else if (m.up === true  || m.up === 1)                          s = 'connected';
        else if (m.up === false || m.up === 0)                          s = 'disconnected';
        // If no status fields found, treat presence in module_stat as connected
        if (!s) s = 'connected';
        if (mac) liveStatus[normaliseMac(mac)] = s;
      }

      // VC-level status (used as fallback)
      const vcStatus = statsData.status === 'connected' || statsData.up === true ? 'connected'
                     : statsData.status === 'disconnected' || statsData.up === false ? 'disconnected'
                     : 'connected';  // VC is reachable since the API call succeeded

      // Check if any MAC from module_stat actually matched our member MACs
      const anyMatch = vc.members.some((member) => liveStatus[normaliseMac(member.mac)] !== undefined);

      for (const member of vc.members) {
        const live = liveStatus[normaliseMac(member.mac)];
        if (live) {
          // Direct MAC match from module_stat
          member.status = live;
        } else if (anyMatch) {
          // Some members matched but this one didn't → it's offline
          member.status = 'disconnected';
        } else {
          // No MAC matches at all (different field name) → use VC-level status for all
          member.status = vcStatus;
        }
      }

      // Log for debugging
      console.log(`[Mist] anyMatch=${anyMatch}, memberStatuses:`, vc.members.map(m => `${m.mac}=${m.status}`));
    } catch (e) {
      console.warn(`[Mist] stats/devices failed for VC ${vc.vc_mac}: ${e.message}`);
    }
  }));

  return [...vcMap.values()].map((vc) => ({
    vc_mac:    vc.vc_mac,
    device_id: vc.device_id,   // virtual chassis logical device ID (mac === vc_mac)
    name:      vc.name,
    site_id:   vc.site_id,
    members:   vc.members.sort(
      (a, b) => (roleOrder[a.vc_role] ?? 3) - (roleOrder[b.vc_role] ?? 3)
    ),
  }));
}

module.exports = { findSwitchByMac, generateVlans, createNetworksOnDevice, removeAppVlansFromDevice, createPortProfilesOnDevice, removeAppPortProfilesFromDevice, assignPortProfilesToDownPorts, removeAppPortAssignmentsFromDevice, getDownPortsForBounce, bouncePortsOnce, listVirtualChassis, preprovisionVC, renumberVC, automateVC };

// Inventory vc_role → Mist API vc_role mapping
const VC_ROLE_MAP = {
  master:   'routing-engine',
  backup:   'routing-engine',
  linecard: 'linecard',
  unknown:  'linecard',
};

/**
 * Preprovision a Virtual Chassis.
 * Calls PUT /api/v1/sites/{site_id}/devices/{device_id}
 * with virtual_chassis payload (preprovisioned=true, per-member role+member_id).
 *
 * @param {string} siteId
 * @param {string} deviceId  - the VC logical device (mac === vc_mac)
 * @param {Array}  members   - [{ mac, vc_role }] from listVirtualChassis()
 */
async function preprovisionVC(siteId, deviceId, members) {
  await validateToken();

  // Sort: prefer existing master/backup/routing-engine first, then linecards/unknown.
  // Role is then assigned purely by position (idx 0 and 1 → routing-engine, rest → linecard)
  // so that a 2-member VC always gets two routing-engines, and a 3+ member VC gets
  // routing-engine for fpc0 & fpc1 and linecard for fpc2+.
  const roleOrder = { master: 0, backup: 1, linecard: 2, unknown: 3 };
  const sorted = [...members].sort(
    (a, b) => (roleOrder[a.vc_role] ?? 3) - (roleOrder[b.vc_role] ?? 3)
  );

  const vcMembers = sorted.map((m, idx) => ({
    mac:       normaliseMac(m.mac),
    vc_role:   idx < 2 ? 'routing-engine' : 'linecard',
    member_id: idx,
  }));

  const body = {
    virtual_chassis: {
      preprovisioned: true,
      members: vcMembers,
    },
    preprovisioned: true,
  };

  const url = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
  console.log(`[Mist] PUT ${url}`, JSON.stringify(body));

  const res = await fetch(url, {
    method:  'PUT',
    headers: { ...mistHeaders(), 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mist preprovision failed (${res.status}): ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : { ok: true };
}

/**
 * Renumber a Virtual Chassis: swap fpc0 (member_id 0) ↔ fpc1 (member_id 1).
 * Same PUT endpoint + payload shape as preprovision — only member_id 0 and 1 exchange.
 * Linecards (member_id >= 2) are untouched.
 *
 * @param {string} siteId
 * @param {string} deviceId
 */
async function renumberVC(siteId, deviceId) {
  await validateToken();

  const url = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;

  // Re-fetch to get the latest member_id state (may have just been preprovisioned)
  console.log(`[Mist] GET ${url} (renumber pre-fetch)`);
  const getRes = await fetch(url, { headers: mistHeaders() });
  if (!getRes.ok) {
    const text = await getRes.text();
    throw new Error(`Failed to fetch device config for renumber (${getRes.status}): ${text}`);
  }
  const config = await getRes.json();

  const currentMembers = config.virtual_chassis && config.virtual_chassis.members;
  if (!currentMembers || currentMembers.length < 2) {
    throw new Error('Cannot renumber: virtual_chassis.members not found or fewer than 2 members');
  }

  const fpc0 = currentMembers.find((m) => m.member_id === 0);
  const fpc1 = currentMembers.find((m) => m.member_id === 1);
  if (!fpc0 || !fpc1) {
    throw new Error('Cannot renumber: member_id 0 or 1 not found in virtual_chassis.members');
  }

  // Swap: slot positions (member_id) stay fixed.
  // The MAC + role that occupies each slot are exchanged —
  // slot 0 gets fpc1's mac/role, slot 1 gets fpc0's mac/role.
  // Linecards (member_id >= 2) are untouched.
  const swappedMembers = currentMembers.map((m) => {
    if (m.member_id === 0) return { mac: normaliseMac(fpc1.mac), vc_role: fpc1.vc_role, member_id: 0 };
    if (m.member_id === 1) return { mac: normaliseMac(fpc0.mac), vc_role: fpc0.vc_role, member_id: 1 };
    return { mac: normaliseMac(m.mac), vc_role: m.vc_role, member_id: m.member_id };
  });

  const body = {
    virtual_chassis: { preprovisioned: true, members: swappedMembers },
    preprovisioned:  true,
  };

  console.log(`[Mist] PUT ${url} (renumber fpc0↔fpc1)`, JSON.stringify(body));
  const putRes = await fetch(url, {
    method:  'PUT',
    headers: { ...mistHeaders(), 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Mist renumber failed (${putRes.status}): ${text}`);
  }

  const text = await putRes.text();
  return text ? JSON.parse(text) : { ok: true };
}

/**
 * Orchestrate all VC automation steps sequentially.
 * Returns an array of step results: [{ step, ok, message }]
 *
 * @param {string} siteId
 * @param {string} deviceId
 * @param {Array}  members  - from listVirtualChassis()
 */
async function automateVC(siteId, deviceId, members, emit) {
  await validateToken();

  // ── Step 1: Fetch current device config (pre-flight) ────────────────────
  let deviceConfig;
  try {
    const url = `${BASE_URL}/api/v1/sites/${siteId}/devices/${deviceId}`;
    console.log(`[Mist] GET ${url} (pre-flight check)`);
    const res = await fetch(url, { headers: mistHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch device config (${res.status}): ${text}`);
    }
    deviceConfig = await res.json();
    emit({ step: 'Fetch Device Config', ok: true, message: 'Device config retrieved successfully' });
  } catch (err) {
    emit({ step: 'Fetch Device Config', ok: false, message: err.message });
    return;
  }

  // ── Step 2: Preprovision VC ───────────────────────────────────────────
  const alreadyPreprovisioned =
    deviceConfig.preprovisioned === true ||
    (deviceConfig.virtual_chassis && deviceConfig.virtual_chassis.preprovisioned === true);

  // Even if already preprovisioned, check whether the existing config has
  // incorrect roles (all linecards, no routing-engine). If so, re-push.
  const existingMembers = deviceConfig.virtual_chassis && deviceConfig.virtual_chassis.members;
  const hasRoutingEngine = existingMembers &&
    existingMembers.some((m) => m.vc_role === 'routing-engine');
  const rolesAreWrong = alreadyPreprovisioned && existingMembers && !hasRoutingEngine;

  let justProvisioned = false;
  if (alreadyPreprovisioned && !rolesAreWrong) {
    emit({ step: 'Preprovision VC', ok: true, message: 'VC is already preprovisioned with correct roles — no changes pushed' });
  } else {
    const reason = rolesAreWrong
      ? 'VC is preprovisioned but has no routing-engine roles — re-pushing with correct roles'
      : 'VC is not preprovisioned — pushing config';
    try {
      await preprovisionVC(siteId, deviceId, members);
      emit({ step: 'Preprovision VC', ok: true, message: `${reason}. Pushed successfully to Mist` });
      justProvisioned = true;
    } catch (err) {
      emit({ step: 'Preprovision VC', ok: false, message: err.message });
      return; // Cannot safely renumber if preprovision failed
    }
  }

  // ── Step 3: Wait 2 minutes after a fresh preprovision ─────────────────
  if (justProvisioned) {
    const WAIT_MS = 2 * 60 * 1000; // 2 minutes
    emit({ step: 'Waiting for Mist to apply preprovision', ok: null, message: 'Waiting 2 minutes before renumber to allow Mist to push the preprovision config to device…' });
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    emit({ step: 'Waiting for Mist to apply preprovision', ok: true, message: 'Wait complete — proceeding to renumber' });
  }

  // ── Step 4: Renumber VC (swap fpc0 ↔ fpc1) ───────────────────────────
  try {
    await renumberVC(siteId, deviceId);
    emit({
      step:    'Renumber VC (fpc0 ↔ fpc1)',
      ok:      true,
      message: 'fpc0 and fpc1 member IDs swapped successfully. Note: port profile assignments are not auto-updated after renumbering — verify them in Mist.',
    });
  } catch (err) {
    emit({ step: 'Renumber VC (fpc0 ↔ fpc1)', ok: false, message: err.message });
  }

  // Future steps go here
}

const APP_PROFILE_PATTERN = /^PROFILE_\d+$/;
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

  console.log(`[Mist] Down ports: ${downPorts.length}, Eligible: ${eligible.length}, Profiles available: ${appProfiles.length}, Requested: ${count}`);

  if (count > eligible.length) {
    throw new Error(
      `Insufficient Port IDs on this model — only ${eligible.length} valid down port${eligible.length !== 1 ? 's' : ''} available, but ${count} requested.`
    );
  }

  if (count > appProfiles.length) {
    throw new Error(
      `Not enough unique port profiles — only ${appProfiles.length} PROFILE_XXX profile${appProfiles.length !== 1 ? 's' : ''} exist on this device, but ${count} unique assignments requested. Create more port profiles first.`
    );
  }

  // 5. Randomly shuffle eligible ports and pick `count` of them
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // 6. Assign a unique PROFILE_XXX to each selected port (shuffle profiles, assign one-to-one)
  const shuffledProfiles = [...appProfiles].sort(() => Math.random() - 0.5);
  const newPortConfig = { ...existingPortConfig };
  const assigned = [];
  for (let i = 0; i < selected.length; i++) {
    const profile = shuffledProfiles[i];
    newPortConfig[selected[i].port_id] = { usage: profile };
    assigned.push({ port_id: selected[i].port_id, profile });
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
