import { useState, useEffect } from 'react';

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Random network generator ──────────────────────────────────────────────────
function generateNetworks(count) {
  const usedIds     = new Set();
  const usedSubnets = new Set();
  const nets        = [];

  for (let i = 0; i < count; i++) {
    let vlanId;
    do { vlanId = Math.floor(Math.random() * 3900) + 100; } // 100–3999
    while (usedIds.has(vlanId));
    usedIds.add(vlanId);

    let subnet;
    do {
      const x = Math.floor(Math.random() * 254) + 1;
      const y = Math.floor(Math.random() * 255);
      subnet  = `10.${x}.${y}.0/24`;
    } while (usedSubnets.has(subnet));
    usedSubnets.add(subnet);

    nets.push({ name: `VLAN_${vlanId}`, vlan_id: vlanId, subnet });
  }
  return nets;
}

// ── Networks tab ──────────────────────────────────────────────────────────────
function NetworksTab({ templateId }) {
  // Create state
  const [count,     setCount]     = useState('');
  const [countErr,  setCountErr]  = useState('');
  const [generated, setGenerated] = useState([]);
  const [creating,  setCreating]  = useState(false);
  const [success,   setSuccess]   = useState(null);
  const [apiError,  setApiError]  = useState('');

  // Delete state
  const [delCount,      setDelCount]      = useState('');
  const [delCountErr,   setDelCountErr]   = useState('');
  const [delPreview,    setDelPreview]    = useState([]);
  const [loadingDel,    setLoadingDel]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [delSuccess,    setDelSuccess]    = useState(null);
  const [delApiError,   setDelApiError]   = useState('');
  const [networkCount,  setNetworkCount]  = useState(null);

  useEffect(() => {
    fetch(`/api/switch-templates/${templateId}/networks`)
      .then((r) => r.json())
      .then((d) => { if (d.networks) setNetworkCount(d.networks.length); })
      .catch(() => {});
  }, [templateId]);

  function handleGenerate() {
    setCountErr(''); setSuccess(null); setApiError('');
    const n = parseInt(count, 10);
    if (!count || isNaN(n) || n < 1 || n > 4000) {
      setCountErr('Enter a number between 1 and 4000.');
      return;
    }
    setGenerated(generateNetworks(n));
  }

  async function handleCreateNetworks() {
    setCreating(true); setApiError(''); setSuccess(null);
    try {
      const res = await fetch(`/api/switch-templates/${templateId}/networks`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ networks: generated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create networks.');
      setSuccess({ count: generated.length, names: generated.map((n) => n.name) });
      setNetworkCount((prev) => (prev ?? 0) + generated.length);
      setGenerated([]); setCount('');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handlePreviewDelete() {
    setDelCountErr(''); setDelSuccess(null); setDelApiError(''); setDelPreview([]);
    const n = parseInt(delCount, 10);
    if (!delCount || isNaN(n) || n < 1) { setDelCountErr('Enter a number greater than 0.'); return; }
    setLoadingDel(true);
    try {
      const res  = await fetch(`/api/switch-templates/${templateId}/networks`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch networks.');
      const all = data.networks || [];
      if (all.length === 0) { setDelCountErr('No networks exist on this template to delete.'); return; }
      setDelPreview(all.slice(0, n));
    } catch (err) {
      setDelApiError(err.message);
    } finally {
      setLoadingDel(false);
    }
  }

  async function handleDeleteNetworks() {
    setDeleting(true); setDelApiError(''); setDelSuccess(null);
    try {
      const res = await fetch(`/api/switch-templates/${templateId}/networks`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ names: delPreview.map((n) => n.name) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete networks.');
      setDelSuccess({ count: delPreview.length, names: delPreview.map((n) => n.name) });
      setNetworkCount((prev) => Math.max(0, (prev ?? 0) - delPreview.length));
      setDelPreview([]); setDelCount('');
    } catch (err) {
      setDelApiError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            How many networks to create?
          </label>
          <input
            type="number" min={1} max={4000} value={count}
            onChange={(e) => { setCount(e.target.value); setCountErr(''); setSuccess(null); setGenerated([]); }}
            placeholder="1 – 4000"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {countErr && <p className="mt-1 text-xs text-red-500">{countErr}</p>}
        </div>
        <button type="button" onClick={handleGenerate}
          className="rounded-lg bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 transition-colors">
          🎲 Generate
        </button>
      </div>

      {/* Preview table */}
      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Preview — {generated.length} network{generated.length > 1 ? 's' : ''}
            </p>
            <button type="button" onClick={handleGenerate}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
              ↺ Regenerate
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['VLAN Name', 'VLAN ID', 'IPv4 Subnet'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {generated.map((net) => (
                  <tr key={net.vlan_id} className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-100">{net.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-indigo-600 dark:text-indigo-400">{net.vlan_id}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{net.subnet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={handleCreateNetworks} disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
            {creating
              ? (<><Spinner /> Creating…</>)
              : `Create ${generated.length} Network${generated.length > 1 ? 's' : ''} in Template`}
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            ✅ {success.count} network{success.count > 1 ? 's' : ''} added to template
          </p>
          <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-mono break-all">
            {success.names.join(', ')}
          </p>
        </div>
      )}

      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{apiError}</p>
        </div>
      )}

      {/* ── Delete section ───────────────────────────── */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Delete Networks</h3>
          {networkCount !== null && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              networkCount === 0
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700'
            }`}>
              {networkCount === 0 ? 'No networks on template' : `${networkCount} network${networkCount > 1 ? 's' : ''} available to delete`}
            </span>
          )}
        </div>

        {/* Delete input row */}
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              How many networks to delete?
            </label>
            <input
              type="number" min={1} value={delCount}
              onChange={(e) => { setDelCount(e.target.value); setDelCountErr(''); setDelSuccess(null); setDelPreview([]); }}
              placeholder="e.g. 5"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {delCountErr && <p className="mt-1 text-xs text-red-500">{delCountErr}</p>}
          </div>
          <button type="button" onClick={handlePreviewDelete} disabled={loadingDel}
            className="rounded-lg bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors inline-flex items-center gap-2">
            {loadingDel ? (<><Spinner /> Fetching…</>) : '🔍 Preview'}
          </button>
        </div>

        {/* Delete preview table */}
        {delPreview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Preview — {delPreview.length} network{delPreview.length > 1 ? 's' : ''} will be removed
              </p>
              <button type="button" onClick={handlePreviewDelete}
                className="text-xs text-red-500 dark:text-red-400 hover:underline">
                ↺ Refresh
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800">
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-red-900/20">
                  <tr>
                    {['VLAN Name', 'VLAN ID', 'IPv4 Subnet'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                  {delPreview.map((net) => (
                    <tr key={net.name} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-100">{net.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-red-600 dark:text-red-400">{net.vlan_id}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{net.subnet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={handleDeleteNetworks} disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
              {deleting
                ? (<><Spinner /> Deleting…</>)
                : `Delete ${delPreview.length} Network${delPreview.length > 1 ? 's' : ''} from Template`}
            </button>
          </div>
        )}

        {delSuccess && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              ✅ {delSuccess.count} network{delSuccess.count > 1 ? 's' : ''} removed from template
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-mono break-all">
              {delSuccess.names.join(', ')}
            </p>
          </div>
        )}

        {delApiError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{delApiError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Port Profiles tab ─────────────────────────────────────────────────────────
function PortProfilesTab({ templateId }) {
  const [networks,    setNetworks]    = useState([]);
  const [loadingNets, setLoadingNets] = useState(false);
  const [netError,    setNetError]    = useState('');

  const [count,     setCount]     = useState('');
  const [countErr,  setCountErr]  = useState('');
  const [mode,      setMode]      = useState('access');

  const [generated, setGenerated] = useState([]);
  const [creating,  setCreating]  = useState(false);
  const [success,   setSuccess]   = useState(null);
  const [apiError,  setApiError]  = useState('');

  // Delete state
  const [delCount,      setDelCount]      = useState('');
  const [delCountErr,   setDelCountErr]   = useState('');
  const [delPreview,    setDelPreview]    = useState([]);
  const [loadingDel,    setLoadingDel]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [delSuccess,    setDelSuccess]    = useState(null);
  const [delApiError,   setDelApiError]   = useState('');
  const [profileCount,  setProfileCount]  = useState(null); // total profiles currently on template

  useEffect(() => {
    async function load() {
      setLoadingNets(true);
      try {
        const [netRes, profRes] = await Promise.all([
          fetch(`/api/switch-templates/${templateId}/networks`),
          fetch(`/api/switch-templates/${templateId}/port-profiles`),
        ]);
        const netData  = await netRes.json();
        const profData = await profRes.json();
        if (!netRes.ok)  throw new Error(netData.error  || 'Failed to load networks.');
        setNetworks(netData.networks || []);
        setProfileCount((profData.profiles || []).length);
      } catch (err) {
        setNetError(err.message);
      } finally {
        setLoadingNets(false);
      }
    }
    load();
  }, [templateId]);

  // For each profile, randomly pick two distinct networks from the available pool,
  // and also randomise Speed, Duplex, and Mac Limit (same values applied to all profiles in the batch).
  function generateProfiles(n) {
    const SPEEDS  = ['auto', '10', '100', '1000', '2500', '5000', '10000'];
    const DUPLEX  = ['auto', 'half', 'full'];
    const pick    = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // One shared set of values for the entire batch
    const batchSpeed    = pick(SPEEDS);
    const batchDuplex   = pick(DUPLEX);
    const batchMacLimit = Math.floor(Math.random() * 255) + 1; // 1–255

    const usedProfileIds = new Set();
    const list           = [];
    const shuffled = [...networks].sort(() => Math.random() - 0.5);

    for (let i = 0; i < n; i++) {
      const portIdx = (i * 2)     % shuffled.length;
      let   voipIdx = (i * 2 + 1) % shuffled.length;
      if (voipIdx === portIdx) voipIdx = (voipIdx + 1) % shuffled.length;

      let profileId;
      do { profileId = Math.floor(Math.random() * 900) + 100; }
      while (usedProfileIds.has(profileId));
      usedProfileIds.add(profileId);

      list.push({
        name:         `PROFILE_${profileId}`,
        mode,
        port_network: shuffled[portIdx].name,
        voip_network: shuffled[voipIdx].name,
        speed:        batchSpeed,
        duplex:       batchDuplex,
        mac_limit:    batchMacLimit,
      });
    }
    return list;
  }

  function handleGenerate() {
    setCountErr(''); setSuccess(null); setApiError('');
    const n = parseInt(count, 10);
    if (!count || isNaN(n) || n < 1) { setCountErr('Enter a number greater than 0.'); return; }
    setGenerated(generateProfiles(n));
  }

  async function handleCreateProfiles() {
    setCreating(true); setApiError(''); setSuccess(null);
    try {
      const res = await fetch(`/api/switch-templates/${templateId}/port-profiles`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ profiles: generated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create port profiles.');
      setSuccess({ count: generated.length, names: generated.map((p) => p.name) });
      setProfileCount((prev) => (prev ?? 0) + generated.length);
      setGenerated([]); setCount('');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handlePreviewDelete() {
    setDelCountErr(''); setDelSuccess(null); setDelApiError(''); setDelPreview([]);
    const n = parseInt(delCount, 10);
    if (!delCount || isNaN(n) || n < 1) { setDelCountErr('Enter a number greater than 0.'); return; }
    setLoadingDel(true);
    try {
      const res  = await fetch(`/api/switch-templates/${templateId}/port-profiles`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch port profiles.');
      const all = data.profiles || [];
      if (all.length === 0) { setDelCountErr('No port profiles exist on this template to delete.'); return; }
      setDelPreview(all.slice(0, n));
    } catch (err) {
      setDelApiError(err.message);
    } finally {
      setLoadingDel(false);
    }
  }

  async function handleDeleteProfiles() {
    setDeleting(true); setDelApiError(''); setDelSuccess(null);
    try {
      const res = await fetch(`/api/switch-templates/${templateId}/port-profiles`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ names: delPreview.map((p) => p.name) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete port profiles.');
      setDelSuccess({ count: delPreview.length, names: delPreview.map((p) => p.name) });
      setProfileCount((prev) => Math.max(0, (prev ?? 0) - delPreview.length));
      setDelPreview([]); setDelCount('');
    } catch (err) {
      setDelApiError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loadingNets) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Spinner /> Loading networks…
      </div>
    );
  }
  if (netError) {
    return <p className="text-sm text-red-500">{netError}</p>;
  }
  if (networks.length < 2) {
    return (
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">⚠️ At least 2 networks required</p>
        <p className="text-sm text-amber-600 dark:text-amber-300 mt-0.5">
          Add networks to this template in the Networks tab first before creating port profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Info pill */}
      <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 px-3 py-1.5 text-xs text-teal-700 dark:text-teal-300">
        <span>🎲</span>
        <span>
          {networks.length} network{networks.length > 1 ? 's' : ''} available — port &amp; VoIP networks, Speed, Duplex &amp; Mac Limit are all assigned randomly per profile
        </span>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-4">

        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
          <div className="flex gap-2">
            {['access', 'trunk'].map((m) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setGenerated([]); setSuccess(null); }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  mode === m
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-teal-400 dark:hover:border-teal-500 bg-white dark:bg-gray-700'
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            How many profiles?
          </label>
          <input type="number" min={1} value={count}
            onChange={(e) => { setCount(e.target.value); setCountErr(''); setGenerated([]); setSuccess(null); }}
            placeholder="e.g. 10"
            className="w-36 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {countErr && <p className="mt-1 text-xs text-red-500">{countErr}</p>}
        </div>

      </div>

      <button type="button" onClick={handleGenerate}
        className="rounded-lg bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 transition-colors">
        🎲 Generate Profiles
      </button>

      {/* Preview table */}
      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Preview — {generated.length} profile{generated.length > 1 ? 's' : ''}
            </p>
            <button type="button" onClick={handleGenerate}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline">↺ Regenerate</button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Profile Name', 'Mode', 'Port Network', 'VoIP Network', 'Speed', 'Duplex', 'Mac Limit'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {generated.map((p) => (
                  <tr key={p.name} className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-100">{p.name}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        p.mode === 'trunk'
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                          : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                      }`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.port_network}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.voip_network}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.speed}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.duplex}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.mac_limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={handleCreateProfiles} disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
            {creating
              ? (<><Spinner /> Creating…</>)
              : `Create ${generated.length} Profile${generated.length > 1 ? 's' : ''} in Template`}
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            ✅ {success.count} port profile{success.count > 1 ? 's' : ''} added to template
          </p>
          <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-mono break-all">
            {success.names.join(', ')}
          </p>
        </div>
      )}

      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{apiError}</p>
        </div>
      )}

      {/* ── Delete section ─────────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Delete Port Profiles</h3>
          {profileCount !== null && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              profileCount === 0
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700'
            }`}>
              {profileCount === 0 ? 'No profiles on template' : `${profileCount} profile${profileCount > 1 ? 's' : ''} available to delete`}
            </span>
          )}
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              How many profiles to delete?
            </label>
            <input
              type="number" min={1} value={delCount}
              onChange={(e) => { setDelCount(e.target.value); setDelCountErr(''); setDelSuccess(null); setDelPreview([]); }}
              placeholder="e.g. 5"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {delCountErr && <p className="mt-1 text-xs text-red-500">{delCountErr}</p>}
          </div>
          <button type="button" onClick={handlePreviewDelete} disabled={loadingDel}
            className="rounded-lg bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors inline-flex items-center gap-2">
            {loadingDel ? (<><Spinner /> Fetching…</>) : '🔍 Preview'}
          </button>
        </div>

        {delPreview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Preview — {delPreview.length} profile{delPreview.length > 1 ? 's' : ''} will be removed
              </p>
              <button type="button" onClick={handlePreviewDelete}
                className="text-xs text-red-500 dark:text-red-400 hover:underline">↺ Refresh</button>
            </div>
            <div className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800">
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-red-900/20">
                  <tr>
                    {['Profile Name', 'Mode', 'Port Network', 'VoIP Network'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                  {delPreview.map((p) => (
                    <tr key={p.name} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-100">{p.name}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          p.mode === 'trunk'
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                            : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                        }`}>
                          {p.mode}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.port_network}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{p.voip_network}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={handleDeleteProfiles} disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
              {deleting
                ? (<><Spinner /> Deleting…</>)
                : `Delete ${delPreview.length} Profile${delPreview.length > 1 ? 's' : ''} from Template`}
            </button>
          </div>
        )}

        {delSuccess && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              ✅ {delSuccess.count} port profile{delSuccess.count > 1 ? 's' : ''} removed from template
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-mono break-all">
              {delSuccess.names.join(', ')}
            </p>
          </div>
        )}

        {delApiError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{delApiError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Template detail view ──────────────────────────────────────────────────────
function TemplateDetailView({ template, onBack }) {
  const [activeTab, setActiveTab] = useState('networks');

  const tabs = [
    { key: 'networks',      label: 'Networks' },
    { key: 'port-profiles', label: 'Port Profiles' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-4 shadow-md">
        <button type="button" onClick={onBack}
          className="text-xs text-teal-100 hover:text-white mb-1 flex items-center gap-1 transition-colors">
          ← Back to Switch Template
        </button>
        <p className="text-lg font-bold text-white tracking-tight">📋 {template.name}</p>
        <p className="text-sm text-teal-100 mt-0.5">Org-level network template — configure settings below.</p>
      </div>

      {/* Template info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Template Details</h2>
        <dl className="text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Name</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-100">{template.name}</dd>
          </div>
        </dl>
      </div>

      {/* Tab card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button key={tab.key} type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'networks' && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Randomly generate VLAN networks and push them into this template.
              </p>
              <NetworksTab templateId={template.id} />
            </>
          )}
          {activeTab === 'port-profiles' && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Create bulk port profiles using networks already on this template.
              </p>
              <PortProfilesTab templateId={template.id} />
            </>
          )}
        </div>

      </div>

    </div>
  );
}

// ── Create form view ──────────────────────────────────────────────────────────
function CreateTemplateView({ savedTemplates, onCreated, onSelectTemplate, onDeleteTemplate }) {
  const [name,     setName]     = useState('');
  const [nameErr,  setNameErr]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setNameErr(''); setApiError('');
    if (!name.trim()) { setNameErr('Template name is required.'); return; }

    setLoading(true);
    try {
      // Step 1 — create
      const createRes = await fetch('/api/switch-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to create template.');

      // Step 2 — fetch full details (includes _apiEndpoint)
      const getRes = await fetch(`/api/switch-templates/${created.id}`);
      const full   = await getRes.json();
      if (!getRes.ok) throw new Error(full.error || 'Template created but could not fetch details.');

      setName('');
      onCreated(full);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">📋 Switch Template</p>
        <p className="text-sm text-teal-100 mt-0.5">Create org-level network templates for your Juniper switches.</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Create Template</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Creates a new network template at the org level via the Mist API.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
            <input
              type="text" value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(''); }}
              placeholder="e.g. Corp-Switch-Baseline"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {nameErr && <p className="mt-1 text-xs text-red-500">{nameErr}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
            {loading ? (<><Spinner /> Creating…</>) : 'Create Template'}
          </button>
        </form>
        {apiError && (
          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{apiError}</p>
          </div>
        )}
      </div>

      {/* Previously created templates — click any to open */}
      {savedTemplates.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Your Templates ({savedTemplates.length})
          </p>
          <div className="space-y-2">
            {savedTemplates.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <button type="button" onClick={() => onSelectTemplate(t)}
                  className="flex-1 text-left rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md shadow-sm transition-all px-5 py-4 group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{t.id}</p>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-teal-500 transition-colors text-lg">→</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTemplate(t)}
                  title="Delete template"
                  className="flex-shrink-0 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 p-3 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Root — toggles between create and detail view ────────────────────────────
export default function SwitchTemplatePage() {
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('st:templates')) || []; } catch { return []; }
  });
  const [activeTemplate,  setActiveTemplateState]  = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('st:active-template')) || null; } catch { return null; }
  });

  function setActiveTemplate(template) {
    if (template) {
      sessionStorage.setItem('st:active-template', JSON.stringify(template));
    } else {
      sessionStorage.removeItem('st:active-template');
    }
    setActiveTemplateState(template);
  }
  const [deletingId,      setDeletingId]      = useState(null);
  const [deleteError,     setDeleteError]     = useState('');

  function handleCreated(template) {
    const updated = [template, ...savedTemplates.filter((t) => t.id !== template.id)];
    sessionStorage.setItem('st:templates', JSON.stringify(updated));
    setSavedTemplates(updated);
    setActiveTemplate(template);
  }

  async function handleDeleteTemplate(template) {
    if (!window.confirm(`Delete template "${template.name}" from Mist? This cannot be undone.`)) return;
    setDeletingId(template.id);
    setDeleteError('');
    try {
      const res = await fetch(`/api/switch-templates/${template.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete template.');
      const updated = savedTemplates.filter((t) => t.id !== template.id);
      sessionStorage.setItem('st:templates', JSON.stringify(updated));
      setSavedTemplates(updated);
      // If the deleted template is currently open, navigate back to the list
      if (activeTemplate && activeTemplate.id === template.id) {
        setActiveTemplate(null);
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (activeTemplate) {
    return <TemplateDetailView template={activeTemplate} onBack={() => setActiveTemplate(null)} />;
  }
  return (
    <>
      <CreateTemplateView
        savedTemplates={savedTemplates}
        onCreated={handleCreated}
        onSelectTemplate={setActiveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />
      {deletingId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-8 py-6 flex items-center gap-3">
            <Spinner />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Deleting template from Mist…</p>
          </div>
        </div>
      )}
      {deleteError && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-red-50 dark:bg-red-900/80 border border-red-200 dark:border-red-700 px-5 py-4 shadow-lg max-w-sm">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">❌ Delete failed</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{deleteError}</p>
          <button type="button" onClick={() => setDeleteError('')} className="mt-2 text-xs text-red-500 hover:underline">Dismiss</button>
        </div>
      )}
    </>
  );
}
