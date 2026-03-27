import { useState } from 'react';


const ROLE_BADGE = {
  master:   'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700',
  backup:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  linecard: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  unknown:  'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
};

export default function VirtualChassisPage() {
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');
  const [vcs,       setVcs]       = useState(null);
  const [debugData, setDebugData] = useState(null);
  const [debugging, setDebugging] = useState(false);

  async function handleLoad() {
    setLoading(true);
    setApiError('');
    setVcs(null);
    setDebugData(null);
    try {
      const res  = await fetch('/api/networks/virtual-chassis');
      const data = await res.json();
      if (!res.ok) setApiError(data.error || 'An unexpected error occurred.');
      else setVcs(data.virtualChassis);
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDebug() {
    setDebugging(true);
    setDebugData(null);
    try {
      const res  = await fetch('/api/networks/vc-debug');
      const data = await res.json();
      setDebugData(data);
    } catch {
      setDebugData({ error: 'Could not reach the backend.' });
    } finally {
      setDebugging(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">🔗 Virtual Chassis</p>
        <p className="text-sm text-indigo-100 mt-0.5">Manage and inspect Virtual Chassis configurations on staging devices.</p>
      </div>

      {/* Step 1 — Discover */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Step 1 — Discover Virtual Chassis</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Scans your org inventory and lists all switches that are members of a Virtual Chassis.
        </p>
        <button type="button" onClick={handleLoad} disabled={loading}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {loading ? 'Scanning…' : '🔍 Find Virtual Chassis Devices'}
        </button>
        <button type="button" onClick={handleDebug} disabled={debugging}
          className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors">
          {debugging ? 'Loading…' : '🛠 Debug Raw API'}
        </button>
      </div>
      </div>

      {/* Error */}
      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {/* No VC found */}
      {vcs !== null && vcs.length === 0 && (
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-5 py-4 text-sm text-yellow-700 dark:text-yellow-400">
          No Virtual Chassis devices found in your org inventory.
        </div>
      )}

      {/* VC list */}
      {vcs !== null && vcs.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {vcs.length} Virtual Chassis found
          </p>

          {vcs.map((vc, i) => (
            <div key={vc.vc_mac} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

              {/* VC header */}
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{vc.name}</p>
                  <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">MAC: {vc.vc_mac}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                  {vc.members.length} member{vc.members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Members table */}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-2.5">Name</th>
                    <th className="text-left px-5 py-2.5">MAC</th>
                    <th className="text-left px-5 py-2.5">Model</th>
                    <th className="text-left px-5 py-2.5">Role</th>
                    <th className="text-left px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {vc.members.map((m) => (
                    <tr key={m.mac} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{m.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{m.mac}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{m.model}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_BADGE[m.vc_role] || ROLE_BADGE.unknown}`}>
                          {m.vc_role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${m.status === 'connected' ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{m.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Debug output */}
      {debugData && (
        <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl border border-gray-700 p-5 overflow-x-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">🛠 Raw API Debug Output</p>
          <pre className="text-xs text-green-400 whitespace-pre-wrap break-all">{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      )}

    </div>
  );
}

