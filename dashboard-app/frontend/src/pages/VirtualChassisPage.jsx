import { useState } from 'react';

const ROLE_BADGE = {
  master:   'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700',
  backup:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  linecard: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  unknown:  'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
};

// ── Member table ──────────────────────────────────────────────────────────────
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

// ── Step log row ──────────────────────────────────────────────────────────────
// step = { step: string, ok: true | false | null, message: string }
// ok=null means running
function StepRow({ step }) {
  const icon = step.ok === null
    ? <span className="animate-spin inline-block h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full" />
    : step.ok
      ? <span className="text-green-500 text-base leading-none">✅</span>
      : <span className="text-red-400 text-base leading-none">❌</span>;

  return (
    <div className="flex items-start gap-3 py-2.5 px-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{step.step}</p>
        <p className={`text-xs mt-0.5 ${step.ok === false ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {step.message}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VirtualChassisPage() {
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [vcs,        setVcs]        = useState(null);
  const [selectedVc, setSelectedVc] = useState(null);
  const [automating, setAutomating] = useState(false);
  const [steps,      setSteps]      = useState([]);

  async function loadVCs() {
    setLoading(true);
    setApiError('');
    setVcs(null);
    setSelectedVc(null);
    setSteps([]);
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

  function selectVc(vc) {
    // Clicking the already-selected card deselects it
    setSelectedVc((prev) => prev?.vc_mac === vc.vc_mac ? null : vc);
    setSteps([]);
  }

  async function handleStartAutomation() {
    setAutomating(true);
    // Show pending state immediately
    setSteps([{ step: 'Preprovision VC', ok: null, message: 'Running…' }]);
    try {
      const res  = await fetch('/api/networks/vc-automate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          site_id:   selectedVc.site_id,
          device_id: selectedVc.device_id,
          vc_mac:    selectedVc.vc_mac,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSteps([{ step: 'Preprovision VC', ok: false, message: data.error || 'Automation failed.' }]);
      } else {
        setSteps(data.steps);
      }
    } catch {
      setSteps([{ step: 'Preprovision VC', ok: false, message: 'Could not reach backend.' }]);
    } finally {
      setAutomating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">🔗 Virtual Chassis</p>
        <p className="text-sm text-indigo-100 mt-0.5">Automate Virtual Chassis provisioning on staging devices.</p>
      </div>

      {/* Discover section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Discover Virtual Chassis</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Scan your org inventory, then click a VC card to select it and run the automation.
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

      {/* VC list */}
      {vcs !== null && vcs.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {vcs.length} Virtual Chassis found — click a card to select
          </p>

          {/* Automation launcher — visible when a VC is selected */}
          {selectedVc && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-500 shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Selected: <span className="text-brand-600 dark:text-brand-400">{selectedVc.name}</span>
                  </p>
                  <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">{selectedVc.vc_mac}</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartAutomation}
                  disabled={automating}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {automating ? '⏳ Running…' : '🚀 Start VC Automation'}
                </button>
              </div>
            </div>
          )}

          {/* Step results log */}
          {steps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Automation Results</p>
                {!automating && steps.every((s) => s.ok) && (
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 ml-auto">All steps passed</span>
                )}
                {!automating && steps.some((s) => s.ok === false) && (
                  <span className="text-xs font-semibold text-red-500 dark:text-red-400 ml-auto">Some steps failed</span>
                )}
              </div>
              {steps.map((s, i) => <StepRow key={i} step={s} />)}
            </div>
          )}

          {/* VC cards */}
          {vcs.map((vc) => {
            const isSelected = selectedVc?.vc_mac === vc.vc_mac;
            return (
              <div
                key={vc.vc_mac}
                onClick={() => selectVc(vc)}
                className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden cursor-pointer transition-all
                  ${isSelected
                    ? 'border-brand-500 dark:border-brand-400 ring-2 ring-brand-500/20'
                    : 'border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md'}`}>

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
                    {isSelected
                      ? <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Selected ✓</span>
                      : <span className="text-xs text-gray-400 dark:text-gray-500">Click to select</span>}
                  </div>
                </div>

                <MemberTable members={vc.members} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

