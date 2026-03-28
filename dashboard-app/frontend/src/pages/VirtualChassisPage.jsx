import { useState, useEffect, useRef } from 'react';

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
function StepRow({ step }) {
  const icon = step.ok === null
    ? <span className="animate-spin inline-block h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full" />
    : step.ok
      ? <span className="text-green-500 text-base leading-none">✅</span>
      : <span className="text-red-400 text-base leading-none">❌</span>;

  return (
    <div className="flex items-start gap-3 py-3 px-5 border-b border-gray-100 dark:border-gray-700 last:border-0">
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

// ── VC Automation Page (detail + runner) ──────────────────────────────────────
function VCAutomationView({ vc, onBack }) {
  const [automating,  setAutomating]  = useState(false);
  const [steps,       setSteps]       = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vc:steps')) || []; } catch { return []; }
  });
  const [ran,         setRan]         = useState(() => sessionStorage.getItem('vc:ran') === 'true');
  const [completed,   setCompleted]   = useState(() => sessionStorage.getItem('vc:completed') === 'true');
  const [members,     setMembers]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vc:members')) || vc.members; } catch { return vc.members; }
  });
  const [refreshing,  setRefreshing]  = useState(false);
  const [refreshErr,  setRefreshErr]  = useState('');
  const abortRef   = useRef(null);
  const readerRef  = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => { sessionStorage.setItem('vc:steps',     JSON.stringify(steps));           }, [steps]);
  useEffect(() => { sessionStorage.setItem('vc:ran',       ran       ? 'true' : 'false'); }, [ran]);
  useEffect(() => { sessionStorage.setItem('vc:completed', completed ? 'true' : 'false'); }, [completed]);
  useEffect(() => { sessionStorage.setItem('vc:members',   JSON.stringify(members));          }, [members]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshErr('');
    try {
      const res  = await fetch('/api/networks/virtual-chassis');
      const data = await res.json();
      if (!res.ok) { setRefreshErr(data.error || 'Refresh failed.'); return; }
      const updated = (data.virtualChassis || []).find((v) => v.vc_mac === vc.vc_mac);
      if (updated) setMembers(updated.members);
      else setRefreshErr('VC not found in latest inventory.');
    } catch {
      setRefreshErr('Could not reach backend.');
    } finally {
      setRefreshing(false);
    }
  }

  function handleStop() {
    stoppedRef.current = true;                          // set flag first
    try { readerRef.current?.cancel(); } catch {}       // kill the stream reader
    try { abortRef.current?.abort(); }  catch {}        // also abort the fetch
  }

  async function handleStart() {
    stoppedRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    readerRef.current = null;
    setAutomating(true);
    setCompleted(false);
    setRan(true);
    setSteps([]);
    try {
      const res = await fetch('/api/networks/vc-automate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body:    JSON.stringify({
          site_id:   vc.site_id,
          device_id: vc.device_id,
          vc_mac:    vc.vc_mac,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSteps([{ step: 'Automation', ok: false, message: data.error || 'Automation failed.' }]);
        return;
      }

      const reader  = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        let done, value;
        try {
          ({ done, value } = await reader.read());
        } catch {
          break; // reader cancelled or fetch aborted
        }
        if (done || stoppedRef.current) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const step = JSON.parse(line);
            setSteps((prev) => {
              const idx = prev.findIndex((s) => s.step === step.step);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = step;
                return updated;
              }
              return [...prev, step];
            });
          } catch { /* ignore malformed line */ }
        }
      }

      // Append a visible stopped entry if the user hit Stop
      if (stoppedRef.current) {
        setSteps((prev) => [...prev, { step: 'Stopped', ok: false, message: 'Automation was stopped by user.' }]);
      }
    } catch (err) {
      if (stoppedRef.current || err.name === 'AbortError') {
        setSteps((prev) => [...prev, { step: 'Stopped', ok: false, message: 'Automation was stopped by user.' }]);
      } else {
        setSteps([{ step: 'Automation', ok: false, message: 'Could not reach backend.' }]);
      }
    } finally {
      setCompleted(true);
      setAutomating(false);
    }
  }

  const allPassed = ran && completed && steps.length > 0 && steps.every((s) => s.ok === true);
  const anyFailed = ran && completed && steps.some((s) => s.ok === false);
  // Show back/run-again only before any run, or once fully completed.
  // While in progress (ran=true, completed=false), both are hidden.
  const isDone = !ran || completed;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner with back */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-4 shadow-md">
        {isDone && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-indigo-200 hover:text-white mb-2 transition-colors">
            ← Back to Virtual Chassis list
          </button>
        )}
        <p className="text-lg font-bold text-white tracking-tight">🔗 {vc.name}</p>
        <p className="text-sm text-indigo-100 mt-0.5">Virtual Chassis Automation</p>
      </div>

      {/* VC detail card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Device Details</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Name</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{vc.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Virtual MAC</p>
            <p className="font-mono text-gray-700 dark:text-gray-300">{vc.vc_mac}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Members</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{members.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Site ID</p>
            <p className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all">{vc.site_id}</p>
          </div>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Members</p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh the VC to see updated stats"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
            <span className={refreshing ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {refreshErr && (
          <p className="px-5 py-2 text-xs text-red-500 dark:text-red-400 border-b border-gray-100 dark:border-gray-700">{refreshErr}</p>
        )}
        <MemberTable members={members} />
      </div>


      {/* Automation launcher */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">VC Automation</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Runs each automation step sequentially and reports the result.
            </p>
          </div>
          {isDone && (
            <button
              type="button"
              onClick={handleStart}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors">
              {ran ? '🔄 Run Again' : '🚀 Start VC Automation'}
            </button>
          )}
          {!isDone && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">⏳ Running…</span>
              <button
                type="button"
                onClick={handleStop}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
                ⛔ Stop
              </button>
            </div>
          )}
        </div>

        {/* Step log */}
        {steps.length > 0 && (
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Results</p>
              {allPassed && <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">All steps passed</span>}
              {anyFailed && <span className="ml-auto text-xs font-semibold text-red-500 dark:text-red-400">Some steps failed</span>}
            </div>
            {steps.map((s, i) => <StepRow key={i} step={s} />)}
          </div>
        )}
      </div>

    </div>
  );
}

// ── VC List View ──────────────────────────────────────────────────────────────
function VCListView({ onStart }) {
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');
  const [vcs,      setVcs]      = useState(null);

  async function loadVCs() {
    setLoading(true);
    setApiError('');
    setVcs(null);
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

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">🔗 Virtual Chassis</p>
        <p className="text-sm text-indigo-100 mt-0.5">Automate Virtual Chassis provisioning on staging devices.</p>
      </div>

      {/* Discover */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Discover Virtual Chassis</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Scan your org inventory, then click a VC card to start VC automation.
        </p>
        <button type="button" onClick={loadVCs} disabled={loading}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {loading ? 'Scanning…' : '🔍 Find Virtual Chassis Devices'}
        </button>
      </div>

      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {vcs !== null && vcs.length === 0 && (
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-5 py-4 text-sm text-yellow-700 dark:text-yellow-400">
          No Virtual Chassis devices found in your org inventory.
        </div>
      )}

      {vcs !== null && vcs.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {vcs.length} Virtual Chassis found — click a card to start VC automation
          </p>

          {/* VC cards */}
          {vcs.map((vc) => (
            <div
              key={vc.vc_mac}
              onClick={() => onStart(vc)}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden cursor-pointer transition-all hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{vc.name}</p>
                  <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">MAC: {vc.vc_mac}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                    {vc.members.length} member{vc.members.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Click to automate →</span>
                </div>
              </div>
              <MemberTable members={vc.members} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function VirtualChassisPage() {
  const [activeVc, setActiveVc] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vc:activeVc')); } catch { return null; }
  });

  function handleStart(vc) {
    sessionStorage.setItem('vc:activeVc', JSON.stringify(vc));
    // Reset persisted automation state for the new VC
    sessionStorage.removeItem('vc:steps');
    sessionStorage.removeItem('vc:ran');
    sessionStorage.removeItem('vc:completed');
    sessionStorage.removeItem('vc:members');
    setActiveVc(vc);
  }

  function handleBack() {
    sessionStorage.removeItem('vc:activeVc');
    sessionStorage.removeItem('vc:steps');
    sessionStorage.removeItem('vc:ran');
    sessionStorage.removeItem('vc:completed');
    sessionStorage.removeItem('vc:members');
    setActiveVc(null);
  }

  return activeVc
    ? <VCAutomationView vc={activeVc} onBack={handleBack} />
    : <VCListView onStart={handleStart} />;
}


