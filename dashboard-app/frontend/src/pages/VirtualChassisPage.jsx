import { useState } from 'react';

const ROLE_BADGE = {
  master:   'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700',
  backup:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  linecard: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  unknown:  'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
};

const DEFAULT_VC_PORTS = 'et-0/0/48,et-0/0/49';

// ── Preprovision Modal ────────────────────────────────────────────────────────
function PreprovisionModal({ vc, onClose, onSuccess }) {
  const [rows, setRows] = useState(
    vc.members.map((m) => ({
      mac:      m.mac,
      name:     m.name,
      vc_role:  m.vc_role === 'unknown' ? 'linecard' : m.vc_role,
      vc_ports: DEFAULT_VC_PORTS,
    }))
  );
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const members = rows.map((r) => ({
        mac:      r.mac,
        vc_role:  r.vc_role,
        vc_ports: r.vc_ports.split(',').map((p) => p.trim()).filter(Boolean),
      }));
      const res  = await fetch('/api/networks/vc-preprovision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ site_id: vc.site_id, device_id: vc.device_id, members }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Preprovision failed.'); return; }
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch {
      setError('Could not reach backend.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">⚙ Preprovision Virtual Chassis</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{vc.name} · {vc.vc_mac}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>

        {/* Member rows */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Assign a role and VC uplink ports for each member. Ports are comma-separated (e.g. <span className="font-mono">et-0/0/48,et-0/0/49</span>).
          </p>

          {rows.map((row, idx) => (
            <div key={row.mac} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{row.name}</span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{row.mac}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                  <select
                    value={row.vc_role}
                    onChange={(e) => updateRow(idx, 'vc_role', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="master">master</option>
                    <option value="backup">backup</option>
                    <option value="linecard">linecard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">VC Ports</label>
                  <input
                    type="text"
                    value={row.vc_ports}
                    onChange={(e) => updateRow(idx, 'vc_ports', e.target.value)}
                    placeholder="et-0/0/48,et-0/0/49"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3"><strong>Error:</strong> {error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-3">✅ Preprovision submitted successfully!</p>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving || success}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50">
              {saving ? 'Sending…' : '🚀 Preprovision'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Member table (shared between list + detail view) ──────────────────────────
function MemberTable({ members }) {
  return (
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
        {members.map((m) => (
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
                <span className={`h-2 w-2 rounded-full ${m.status === 'connected' ? 'bg-green-500' : m.status === 'disconnected' ? 'bg-red-400' : 'bg-gray-400'}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{m.status}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VirtualChassisPage() {
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [vcs,         setVcs]         = useState(null);
  const [selectedVc,  setSelectedVc]  = useState(null);  // null = list, object = detail
  const [showModal,   setShowModal]   = useState(false);

  async function loadVCs() {
    setLoading(true);
    setApiError('');
    setVcs(null);
    setSelectedVc(null);
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

  function openDetail(vc) {
    setSelectedVc(vc);
    setShowModal(false);
  }

  function backToList() {
    setSelectedVc(null);
    setShowModal(false);
  }

  // After preprovision succeeds, refresh the VC list and reselect the same VC
  async function handlePreprovisionSuccess() {
    const res  = await fetch('/api/networks/virtual-chassis');
    const data = await res.json();
    if (res.ok) {
      setVcs(data.virtualChassis);
      const refreshed = data.virtualChassis.find((v) => v.vc_mac === selectedVc.vc_mac);
      if (refreshed) setSelectedVc(refreshed);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">🔗 Virtual Chassis</p>
        <p className="text-sm text-indigo-100 mt-0.5">Manage and inspect Virtual Chassis configurations on staging devices.</p>
      </div>

      {/* ── DETAIL VIEW ── */}
      {selectedVc ? (
        <>
          {/* Back + header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={backToList}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
                ← Back to list
              </button>
            </div>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedVc.name}</p>
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">Virtual MAC: {selectedVc.vc_mac}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {selectedVc.members.length} member{selectedVc.members.length !== 1 ? 's' : ''} · Site: {selectedVc.site_id}
                </p>
              </div>
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors">
                ⚙ Modify VC
              </button>
            </div>
          </div>

          {/* Members table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Members</p>
            </div>
            <MemberTable members={selectedVc.members} />
          </div>

          {/* Preprovision modal */}
          {showModal && (
            <PreprovisionModal
              vc={selectedVc}
              onClose={() => setShowModal(false)}
              onSuccess={handlePreprovisionSuccess}
            />
          )}
        </>
      ) : (
        /* ── LIST VIEW ── */
        <>
          {/* Discover section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Step 1 — Discover Virtual Chassis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Scans your org inventory and lists all switches that are members of a Virtual Chassis.
            </p>
            <button type="button" onClick={loadVCs} disabled={loading}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {loading ? 'Scanning…' : '🔍 Find Virtual Chassis Devices'}
            </button>
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

          {/* VC cards */}
          {vcs !== null && vcs.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {vcs.length} Virtual Chassis found — click a card to manage
              </p>
              {vcs.map((vc) => (
                <div key={vc.vc_mac}
                  onClick={() => openDetail(vc)}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden cursor-pointer hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all">

                  {/* VC header */}
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{vc.name}</p>
                      <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">MAC: {vc.vc_mac}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                        {vc.members.length} member{vc.members.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">View →</span>
                    </div>
                  </div>

                  {/* Members table (read-only preview) */}
                  <MemberTable members={vc.members} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


