import { useState } from 'react';

const MAC_REGEX = /^([0-9a-fA-F]{2}[:\-]?){5}[0-9a-fA-F]{2}$/;

const VIEWS = [
  { value: 'bulk-networks',        label: 'Create Bulk Networks' },
  { value: 'bulk-port-profile',    label: 'Create Bulk Port Profile' },
  { value: 'bulk-port-assignment', label: 'Create Bulk Port Profile Assignment' },
];

function RemoveSection() {
  const [mac,        setMac]        = useState('');
  const [macError,   setMacError]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [apiError,   setApiError]   = useState('');

  async function handleRemove(e) {
    e.preventDefault();
    if (!mac.trim()) { setMacError('MAC address is required.'); return; }
    if (!MAC_REGEX.test(mac.trim())) { setMacError('Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.'); return; }

    setMacError('');
    setApiError('');
    setResult(null);
    setLoading(true);

    try {
      const res  = await fetch('/api/networks/remove', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setApiError(data.error || 'An unexpected error occurred.');
      else setResult(data);
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Delete Recently Created VLANs</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Enter a switch MAC address to remove all <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded text-xs">VLAN_XXX</code> networks created by this app.
      </p>

      <form onSubmit={handleRemove} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="e.g. AA:BB:CC:DD:EE:FF"
            value={mac}
            onChange={(e) => { setMac(e.target.value); setMacError(''); setResult(null); setApiError(''); }}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono
              bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-red-400
              ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50
                     text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? 'Removing…' : 'Remove VLANs'}
        </button>
      </form>

      {apiError && (
        <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {result && (
        <div className={`mt-4 rounded-xl px-5 py-4 text-sm border
          ${result.removed > 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'}`}
        >
          {result.removed > 0
            ? <>✓ <strong>{result.removed} VLAN{result.removed !== 1 ? 's' : ''}</strong> removed from <strong>{result.switch.name}</strong> ({result.switch.mac})</>
            : <>No app-created VLANs found on <strong>{result.switch.name}</strong> — nothing to remove.</>
          }
        </div>
      )}
    </div>
  );
}

// ── Remove Port Profiles Section ──────────────────────────────────────────────

function RemoveProfilesSection() {
  const [mac,      setMac]      = useState('');
  const [macError, setMacError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [apiError, setApiError] = useState('');

  async function handleRemove(e) {
    e.preventDefault();
    if (!mac.trim()) { setMacError('MAC address is required.'); return; }
    if (!MAC_REGEX.test(mac.trim())) { setMacError('Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.'); return; }
    setMacError(''); setApiError(''); setResult(null); setLoading(true);
    try {
      const res  = await fetch('/api/networks/remove-profiles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setApiError(data.error || 'An unexpected error occurred.');
      else setResult(data);
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Delete Recently Created Port Profiles</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Removes all <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded text-xs">PROFILE_XXX</code> entries from the device.
      </p>
      <form onSubmit={handleRemove} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input type="text" placeholder="e.g. AA:BB:CC:DD:EE:FF" value={mac}
            onChange={(e) => { setMac(e.target.value); setMacError(''); setResult(null); setApiError(''); }}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
        </div>
        <button type="submit" disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
          {loading ? 'Removing…' : 'Remove Profiles'}
        </button>
      </form>
      {apiError && <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400"><strong>Error:</strong> {apiError}</div>}
      {result && (
        <div className={`mt-4 rounded-xl px-5 py-4 text-sm border ${result.removed > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'}`}>
          {result.removed > 0
            ? <>✓ <strong>{result.removed} profile{result.removed !== 1 ? 's' : ''}</strong> removed from <strong>{result.switch.name}</strong> ({result.switch.mac})</>
            : <>No app-created profiles found on <strong>{result.switch.name}</strong> — nothing to remove.</>}
        </div>
      )}
    </div>
  );
}

// ── Bulk Port Profile View ────────────────────────────────────────────────────

function BulkPortProfileView() {
  const [mac,          setMac]          = useState('');
  const [profileCount, setProfileCount] = useState('');
  const [mode,         setMode]         = useState('access');
  const [macError,     setMacError]     = useState('');
  const [countError,   setCountError]   = useState('');
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [apiError,     setApiError]     = useState('');

  function validateCount(value) {
    const n = parseInt(value);
    if (!value) return 'Profile count is required.';
    if (isNaN(n) || n < 1) return 'Must be at least 1.';
    if (n > 100) return 'Maximum 100 profiles per request.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const macErr   = !mac.trim() ? 'MAC address is required.'
                   : !MAC_REGEX.test(mac.trim()) ? 'Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.' : '';
    const countErr = validateCount(profileCount);
    if (macErr)   setMacError(macErr);
    if (countErr) setCountError(countErr);
    if (macErr || countErr) return;
    setMacError(''); setCountError(''); setApiError(''); setResult(null); setLoading(true);
    try {
      const res  = await fetch('/api/networks/port-profiles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim(), count: parseInt(profileCount), mode }),
      });
      const data = await res.json();
      if (!res.ok) setApiError(data.error || 'An unexpected error occurred.');
      else setResult(data);
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Create Port Profiles on a Staging Device</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Randomly assigns existing <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded text-xs">VLAN_XXX</code> networks as Port and VoIP networks per profile.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Switch MAC Address</label>
              <input type="text" placeholder="e.g. AA:BB:CC:DD:EE:FF" value={mac}
                onChange={(e) => { setMac(e.target.value); setMacError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Profile Count (1–100)</label>
              <input type="number" min="1" max="100" placeholder="e.g. 2" value={profileCount}
                onChange={(e) => { setProfileCount(e.target.value); setCountError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${countError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {countError && <p className="text-xs text-red-500 mt-1">{countError}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Port Mode</label>
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {['access', 'trunk'].map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`px-5 py-2 text-sm font-semibold transition-colors capitalize ${mode === m ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {loading ? 'Creating…' : 'Create Port Profiles'}
          </button>
        </form>
      </div>

      {apiError && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400"><strong>Error:</strong> {apiError}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-500/20 rounded-xl px-5 py-4 text-sm">
            <p className="font-semibold text-brand-700 dark:text-brand-400">Switch found ✓</p>
            <p className="text-gray-600 dark:text-gray-300 mt-0.5">
              <span className="font-medium">Name:</span> {result.switch.name} &nbsp;·&nbsp;
              <span className="font-medium">MAC:</span> {result.switch.mac}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {result.created.length} Profile{result.created.length !== 1 ? 's' : ''} Created
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Profile Name</th>
                  <th className="text-left px-5 py-3">Mode</th>
                  <th className="text-left px-5 py-3">Port Network</th>
                  <th className="text-left px-5 py-3">VoIP Network</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {result.created.map((p) => (
                  <tr key={p.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{p.name}</td>
                    <td className="px-5 py-3 capitalize text-gray-600 dark:text-gray-300">{p.mode}</td>
                    <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-200">{p.port_network}</td>
                    <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-200">{p.voip_network}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Created</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <hr className="border-gray-200 dark:border-gray-700" />
      <RemoveProfilesSection />
    </div>
  );
}

export default function Dashboard() {
  const [view,       setView]       = useState('bulk-networks');
  const [mac,        setMac]        = useState('');
  const [vlanCount,  setVlanCount]  = useState('');
  const [macError,   setMacError]   = useState('');
  const [countError, setCountError] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [apiError,   setApiError]   = useState('');

  function validateMac(value) {
    if (!value.trim()) return 'MAC address is required.';
    if (!MAC_REGEX.test(value.trim())) return 'Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.';
    return '';
  }

  function validateCount(value) {
    const n = parseInt(value);
    if (!value) return 'VLAN count is required.';
    if (isNaN(n) || n < 1) return 'Must be at least 1.';
    if (n > 4000) return 'Maximum 4000 VLANs per request.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const macErr   = validateMac(mac);
    const countErr = validateCount(vlanCount);
    if (macErr)   setMacError(macErr);
    if (countErr) setCountError(countErr);
    if (macErr || countErr) return;

    setMacError('');
    setCountError('');
    setApiError('');
    setResult(null);
    setLoading(true);

    try {
      const res  = await fetch('/api/networks/provision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim(), count: parseInt(vlanCount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || 'An unexpected error occurred.');
      } else {
        setResult(data);
      }
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header with dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <select
          value={view}
          onChange={(e) => { setView(e.target.value); setResult(null); setApiError(''); }}
          className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold
                     text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          {VIEWS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {VIEWS.find((v) => v.value === view)?.label}
      </h1>

      {/* Bulk Port Profile */}
      {view === 'bulk-port-profile' && <BulkPortProfileView />}

      {/* Bulk Port Profile Assignment */}
      {view === 'bulk-port-assignment' && <BulkPortProfileAssignmentView />}

      {/* Bulk Networks */}
      {view === 'bulk-networks' && (<>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Create VLANs on a Staging Device</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Enter a switch MAC address and the number of VLANs to create on that device.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* MAC Address */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Switch MAC Address</label>
              <input
                type="text"
                placeholder="e.g. AA:BB:CC:DD:EE:FF"
                value={mac}
                onChange={(e) => { setMac(e.target.value); setMacError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono
                  bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500
                  ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
            </div>

            {/* VLAN Count */}
            <div className="w-full sm:w-40">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">VLAN Count (1–4000)</label>
              <input
                type="number"
                min="1"
                max="4000"
                placeholder="e.g. 10"
                value={vlanCount}
                onChange={(e) => { setVlanCount(e.target.value); setCountError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm
                  bg-white dark:bg-gray-700 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-brand-500
                  ${countError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {countError && <p className="text-xs text-red-500 mt-1">{countError}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50
                       text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Creating…' : 'Create VLANs'}
          </button>
        </form>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Switch info */}
          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-500/20 rounded-xl px-5 py-4 text-sm">
            <p className="font-semibold text-brand-700 dark:text-brand-400">Switch found ✓</p>
            <p className="text-gray-600 dark:text-gray-300 mt-0.5">
              <span className="font-medium">Name:</span> {result.switch.name} &nbsp;·&nbsp;
              <span className="font-medium">MAC:</span> {result.switch.mac} &nbsp;·&nbsp;
              <span className="font-medium">Site ID:</span> {result.switch.site_id}
            </p>
          </div>

          {/* Created VLANs table */}
          {result.created.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {result.created.length} VLANs Created
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">VLAN ID</th>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Subnet</th>
                    <th className="text-left px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {result.created.map((v) => (
                    <tr key={v.id || v.vlan_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-200">{v.vlan_id}</td>
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{v.name}</td>
                      <td className="px-5 py-3 font-mono text-gray-600 dark:text-gray-300">{v.subnet}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          ✓ Created
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Failed VLANs */}
          {result.failed && result.failed.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4 text-sm text-red-700 dark:text-red-400">
              <p className="font-semibold mb-2">Failed to create {result.failed.length} VLAN(s):</p>
              <ul className="list-disc list-inside space-y-1">
                {result.failed.map((f, i) => (
                  <li key={i}><span className="font-medium">{f.vlan}</span>: {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Remove VLANs */}
      <RemoveSection />

      </>)}

    </div>
  );
}

// ── Remove Port Profile Assignments Section ───────────────────────────────────

function RemoveAssignmentsSection() {
  const [mac,      setMac]      = useState('');
  const [macError, setMacError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [apiError, setApiError] = useState('');

  async function handleRemove(e) {
    e.preventDefault();
    if (!mac.trim()) { setMacError('MAC address is required.'); return; }
    if (!MAC_REGEX.test(mac.trim())) { setMacError('Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.'); return; }
    setMacError(''); setApiError(''); setResult(null); setLoading(true);
    try {
      const res  = await fetch('/api/networks/remove-assignments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setApiError(data.error || 'An unexpected error occurred.');
      else setResult(data);
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Remove Port Profile Assignments</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Removes all <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded text-xs">PROFILE_XXX</code> assignments from <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded text-xs">port_config</code> on the device.
      </p>
      <form onSubmit={handleRemove} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input type="text" placeholder="e.g. AA:BB:CC:DD:EE:FF" value={mac}
            onChange={(e) => { setMac(e.target.value); setMacError(''); setResult(null); setApiError(''); }}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
        </div>
        <button type="submit" disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
          {loading ? 'Removing…' : 'Remove Assignments'}
        </button>
      </form>
      {apiError && <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400"><strong>Error:</strong> {apiError}</div>}
      {result && (
        <div className={`mt-4 rounded-xl px-5 py-4 text-sm border ${result.removed > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'}`}>
          {result.removed > 0
            ? <>✓ <strong>{result.removed} assignment{result.removed !== 1 ? 's' : ''}</strong> removed from <strong>{result.switch.name}</strong> ({result.switch.mac})</>
            : <>No app-created profile assignments found on <strong>{result.switch.name}</strong> — nothing to remove.</>}
        </div>
      )}
    </div>
  );
}

// ── Bulk Port Profile Assignment View ──────────────────────────────────────────

function BulkPortProfileAssignmentView() {
  const [mac,        setMac]        = useState('');
  const [count,      setCount]      = useState('');
  const [macError,   setMacError]   = useState('');
  const [countError, setCountError] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [apiError,   setApiError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const macErr   = !mac.trim() ? 'MAC address is required.'
                   : !MAC_REGEX.test(mac.trim()) ? 'Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.' : '';
    const countErr = !count ? 'Port count is required.'
                   : (isNaN(parseInt(count)) || parseInt(count) < 1) ? 'Must be at least 1.' : '';
    if (macErr)   setMacError(macErr);
    if (countErr) setCountError(countErr);
    if (macErr || countErr) return;

    setMacError(''); setCountError(''); setApiError(''); setResult(null); setLoading(true);
    try {
      const res  = await fetch('/api/networks/assign-profiles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim(), count: parseInt(count) }),
      });
      const data = await res.json();
      if (!res.ok) setApiError(data.error || 'An unexpected error occurred.');
      else setResult(data);
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Assign Port Profiles to Down Ports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Assigns existing <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded text-xs">PROFILE_XXX</code> profiles to down ports.
          VCP and uplink ports are automatically skipped. Ports already assigned are skipped.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Switch MAC Address</label>
              <input type="text" placeholder="e.g. AA:BB:CC:DD:EE:FF" value={mac}
                onChange={(e) => { setMac(e.target.value); setMacError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Number of Ports to Assign</label>
              <input type="number" min="1" placeholder="e.g. 8" value={count}
                onChange={(e) => { setCount(e.target.value); setCountError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${countError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {countError && <p className="text-xs text-red-500 mt-1">{countError}</p>}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {loading ? 'Assigning…' : 'Assign Port Profiles'}
          </button>
        </form>
      </div>

      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {result && result.assigned.length === 0 && (
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-5 py-4 text-sm text-yellow-700 dark:text-yellow-400">
          No valid down ports available to assign on <strong>{result.switch.name}</strong>.
        </div>
      )}

      {result && result.assigned.length > 0 && (
        <div className="space-y-4">
          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-500/20 rounded-xl px-5 py-4 text-sm">
            <p className="font-semibold text-brand-700 dark:text-brand-400">Switch found ✓</p>
            <p className="text-gray-600 dark:text-gray-300 mt-0.5">
              <span className="font-medium">Name:</span> {result.switch.name} &nbsp;·&nbsp;
              <span className="font-medium">MAC:</span> {result.switch.mac} &nbsp;·&nbsp;
              <span className="font-medium">{result.assigned.length} assigned</span>
              {result.skipped > 0 && <> &nbsp;·&nbsp; <span className="text-gray-500 dark:text-gray-400">{result.skipped} skipped (VCP / uplink / already assigned)</span></>}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {result.assigned.length} Port{result.assigned.length !== 1 ? 's' : ''} Assigned
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Port ID</th>
                  <th className="text-left px-5 py-3">Assigned Profile</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {result.assigned.map((a) => (
                  <tr key={a.port_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-5 py-3 font-mono text-gray-800 dark:text-gray-100">{a.port_id}</td>
                    <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-200">{a.profile}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Assigned</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <hr className="border-gray-200 dark:border-gray-700" />
      <RemoveAssignmentsSection />
    </div>
  );
}
