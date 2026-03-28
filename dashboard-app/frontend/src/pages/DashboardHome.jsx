import { useState, useEffect } from 'react';

const NETWORKS_BACK_ITEMS = [
  'Networks',
  'Port Profiles',
  'Port Profile Assignment',
];

const BOUNCE_BACK_ITEMS = [
  'For multiple ports',
  'For any specific time',
];

const VC_BACK_ITEMS = [
  'For VC features',
];

const SWITCH_TEMPLATE_BACK_ITEMS = [
  'Org-level templates',
  'For all Juniper switches',
];

function FlipCard({ title, backHeader, backItems, onClick }) {
  const [flipped, setFlipped] = useState(false);

  const faceBase = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      style={{
        perspective: '1000px',
        height: '176px',
        // Spring easing (0.34, 1.56, 0.64, 1) overshoots slightly → natural bounce
        transform: flipped ? 'translateY(-10px) scale(1.05)' : 'translateY(0px) scale(1)',
        transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        filter: flipped
          ? 'drop-shadow(0 24px 48px rgba(0,0,0,0.22))'
          : 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))',
      }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* Front */}
        <div
          style={{ ...faceBase, background: 'linear-gradient(to top right, #e8c97a, #fdf6e3)', border: '1px solid #d4a843' }}
        >
          <p style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#111827', lineHeight: 1.3 }}>
            {title}
          </p>
          <span style={{ marginTop: 'auto', fontSize: '0.82rem', fontWeight: 500, color: '#9ca3af' }}>
            Hover to preview →
          </span>
        </div>

        {/* Back */}
        <div
          onClick={onClick}
          style={{
            ...faceBase,
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            cursor: 'pointer',
          }}
        >
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, marginBottom: '0.5rem' }}>
            {backHeader}
          </p>
          <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {backItems.map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>
                <span style={{ color: '#a5f3fc', flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Let's automate →
          </span>
        </div>

      </div>
    </div>
  );
}

function PlainCard({ title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: '160px' }}
      className="group w-full text-left bg-white dark:bg-amber-50 rounded-2xl border border-gray-100 dark:border-amber-100 shadow-sm hover:scale-[1.06] hover:shadow-2xl hover:border-brand-300 dark:hover:border-brand-400 active:scale-[0.97] transition-all duration-200 p-6 flex flex-col items-start gap-4"
    >
      <p className="text-base font-extrabold tracking-tight text-gray-900 dark:text-gray-900 group-hover:text-brand-600 dark:group-hover:text-brand-700 transition-colors leading-snug">
        {title}
      </p>
      <span className="mt-auto text-xs font-medium text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-200">
        Let's automate →
      </span>
    </button>
  );
}

// ── SVG Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ pct, color, trackColor = '#e5e7eb', size = 200, idle = false }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = idle ? 0 : Math.max(0, Math.min(1, pct / 100)) * circ;
  const ringColor = idle ? '#d1d5db' : color;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={idle ? '#f3f4f6' : trackColor} strokeWidth="13" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={ringColor}
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
      {idle ? (
        <>
          <text x="50" y="46" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9ca3af">No active</text>
          <text x="50" y="58" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9ca3af">run</text>
        </>
      ) : (
        <>
          <text x="50" y="44" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
            {pct}%
          </text>
          <text x="50" y="60" textAnchor="middle" fontSize="9" fontWeight="600" fill="#9ca3af">
            complete
          </text>
        </>
      )}
    </svg>
  );
}

// ── Polling hook: reads live progress from storage every second ───────────────
function useRunsInProgress() {
  const [runs, setRuns] = useState([]);
  useEffect(() => {
    function read() {
      const result = [];

      // Bounce Port — localStorage (3 switches)
      ['bounce_session_1', 'bounce_session_2', 'bounce_session_3'].forEach((storageKey, idx) => {
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey));
          if (saved && saved.endTime > Date.now()) {
            const totalSecs = saved.durationMins * 60;
            const remaining = Math.max(0, (saved.endTime - Date.now()) / 1000);
            const pct       = Math.min(99, Math.round(((totalSecs - remaining) / totalSecs) * 100));
            const remMins   = Math.floor(remaining / 60);
            const remSecs   = Math.round(remaining % 60);
            result.push({
              key:         `bounce_${idx + 1}`,
              label:       `Bounce – Switch ${idx + 1}`,
              sub:         saved.switchInfo?.name || 'Running',
              pct,
              detail:      `${remMins}m ${String(remSecs).padStart(2, '0')}s remaining`,
              bounceCount: saved.bounceCount || 0,
              color:       '#10b981',
              track:       '#d1fae5',
            });
          }
        } catch { /* ignore */ }
      });

      // VC Automation — sessionStorage
      try {
        const ran       = sessionStorage.getItem('vc:ran')       === 'true';
        const completed = sessionStorage.getItem('vc:completed') === 'true';
        if (ran && !completed) {
          const steps      = JSON.parse(sessionStorage.getItem('vc:steps')) || [];
          const done       = steps.filter((s) => s.ok !== null).length;
          const total      = Math.max(steps.length, 8);
          const pct        = total === 0 ? 0 : Math.round((done / total) * 100);
          const activeStep = steps.find((s) => s.ok === null);
          result.push({
            key:    'vc',
            label:  'Virtual Chassis',
            sub:    activeStep ? activeStep.step : `${done}/${total} steps done`,
            pct,
            detail: `${done} of ${total} steps complete`,
            color:  '#6366f1',
            track:  '#e0e7ff',
          });
        }
      } catch { /* ignore */ }

      setRuns(result);
    }

    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, []);
  return runs;
}

// ── Inventory stats hook — polls /api/inventory/stats every 30 s ─────────────
function useInventoryStats() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/inventory/stats');
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to load inventory.'); setData(null); }
      else         { setData(json); setError(''); setLastUpdated(new Date()); }
    } catch {
      setError('Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, lastUpdated, refresh: load };
}

// ── Per-device-type inventory card ───────────────────────────────────────────
const INV_CARDS = [
  { key: 'standalone', label: 'Standalone Switches', icon: '🔌', accent: '#2563eb', labelColor: '#1e40af', connColor: '#16a34a', discColor: '#dc2626', borderTop: '#2563eb' },
  { key: 'vc',         label: 'VC Switches',         icon: '🔗', accent: '#7c3aed', labelColor: '#5b21b6', connColor: '#16a34a', discColor: '#dc2626', borderTop: '#7c3aed' },
  { key: 'ap',         label: 'Access Points',       icon: '📡', accent: '#d97706', labelColor: '#92400e', connColor: '#16a34a', discColor: '#dc2626', borderTop: '#d97706' },
];

function InventoryPanel() {
  const { data, loading, error, lastUpdated, refresh } = useInventoryStats();

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 tracking-tight flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {loading
              ? <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              : <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />}
          </span>
          Live Inventory
        </p>
        <button type="button" onClick={refresh} disabled={loading} title="Refresh now"
          className="text-lg text-gray-400 hover:text-brand-500 disabled:opacity-40 transition-colors leading-none">
          ↻
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cards */}
      {INV_CARDS.map(({ key, label, icon, accent, labelColor, connColor, discColor, borderTop }) => {
        const d = data?.[key];
        const total        = loading && !d ? null : (d?.total        ?? 0);
        const connected    = loading && !d ? null : (d?.connected    ?? 0);
        const disconnected = loading && !d ? null : (d?.disconnected ?? 0);
        return (
          <div key={key}
            className="rounded-2xl bg-white dark:bg-gray-800 shadow-md px-5 py-4"
            style={{ borderTop: `4px solid ${borderTop}`, border: `1px solid #e5e7eb`, borderTopWidth: '4px', borderTopColor: borderTop }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl leading-none">{icon}</span>
              <p className="text-xs font-bold tracking-tight leading-tight" style={{ color: labelColor }}>{label}</p>
            </div>
            <p className="text-4xl font-extrabold leading-none mb-3" style={{ color: accent }}>
              {total === null ? '—' : total}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
                  Connected
                </span>
                <span className="font-bold" style={{ color: connColor }}>
                  {connected === null ? '…' : connected}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block flex-shrink-0" />
                  Disconnected
                </span>
                <span className="font-bold" style={{ color: discColor }}>
                  {disconnected === null ? '…' : disconnected}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Updated {lastUpdated.toLocaleTimeString('en-US', { hour12: false })} · auto-refreshes every 30s
        </p>
      )}
    </div>
  );
}

// Static slot definitions — always shown
const RUN_SLOTS = [
  { key: 'bounce_1', label: 'Bounce – Switch 1', page: 'bounce-port', idleColor: '#10b981', idleTrack: '#d1fae5' },
  { key: 'bounce_2', label: 'Bounce – Switch 2', page: 'bounce-port', idleColor: '#10b981', idleTrack: '#d1fae5' },
  { key: 'bounce_3', label: 'Bounce – Switch 3', page: 'bounce-port', idleColor: '#10b981', idleTrack: '#d1fae5' },
  { key: 'vc',       label: 'Virtual Chassis',   page: 'virtual-chassis', idleColor: '#6366f1', idleTrack: '#e0e7ff' },
];

// ── Runs In Progress section ─────────────────────────────────────────────────
function RunsInProgress({ runs, onNavigate }) {
  const activeCount = runs.length;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          {activeCount > 0 ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-300 dark:bg-gray-600" />
          )}
        </span>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 tracking-tight">Runs in Progress</p>
        {activeCount > 0 ? (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold">
            {activeCount} active
          </span>
        ) : (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs font-semibold">
            none active
          </span>
        )}
      </div>
      <div className="flex gap-12 flex-wrap">
        {RUN_SLOTS.map((slot) => {
          const run  = runs.find((r) => r.key === slot.key);
          const live = Boolean(run);
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => onNavigate(slot.page)}
              className="group flex flex-col items-center gap-2 transition-opacity duration-200 hover:opacity-80 bg-transparent border-none p-0"
            >
              {live
                ? <DonutChart pct={run.pct} color={run.color} trackColor={run.track} />
                : <DonutChart pct={0} color={slot.idleColor} trackColor={slot.idleTrack} idle />
              }
              <p className={`text-xs font-bold tracking-tight text-center ${ live ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500' }`}>
                {slot.label}
              </p>
              {live ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate max-w-[120px]">{run.sub}</p>
                  <p className="text-xs font-semibold text-center" style={{ color: run.color }}>{run.detail}</p>
                  {run.bounceCount != null && (
                    <p className="text-xs font-bold text-center" style={{ color: run.color }}>
                      {run.bounceCount} bounce{run.bounceCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-300 dark:text-gray-600 text-center">Not running</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardHome({ onNavigate }) {
  const runs = useRunsInProgress();
  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl">

      {/* ── Left column: main content ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-8">

        {/* Top header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-zinc-800 px-8 py-6 shadow-md relative overflow-hidden">
          <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute bottom-0 left-1/4 h-16 w-16 rounded-full bg-white/5 blur-xl" />
          {/* Dashboard grid icon — top right */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="26" height="26" rx="6" fill="#ef4444" fillOpacity="0.9" />
              <rect x="34" y="4" width="26" height="26" rx="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
              <rect x="4" y="34" width="26" height="26" rx="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
              <rect x="34" y="34" width="26" height="26" rx="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
            </svg>
          </div>
          <p className="text-5xl font-extrabold text-white tracking-tight leading-tight relative">Dashboard</p>
          <p className="text-base text-slate-300 mt-2 relative">Pick a tool below to get started — everything you need is one click away.</p>
        </div>

        {/* Feature flip-cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <FlipCard
            title="Networks & Port Profiles"
            backHeader="Here you can create Bulk"
            backItems={NETWORKS_BACK_ITEMS}
            onClick={() => onNavigate('networks')}
          />
          <FlipCard
            title="Bounce Ports"
            backHeader="Here you can Continuously Bounce Port"
            backItems={BOUNCE_BACK_ITEMS}
            onClick={() => onNavigate('bounce-port')}
          />
          <FlipCard
            title="Virtual Chassis"
            backHeader="Here you can run VC automation"
            backItems={VC_BACK_ITEMS}
            onClick={() => onNavigate('virtual-chassis')}
          />
          <FlipCard
            title="Org Template"
            backHeader="Here you can create Switch Templates"
            backItems={SWITCH_TEMPLATE_BACK_ITEMS}
            onClick={() => onNavigate('switch-template')}
          />
        </div>

        {/* Runs in Progress */}
        <RunsInProgress runs={runs} onNavigate={onNavigate} />

      </div>

      {/* ── Right column: live inventory panel ────────────────────────────── */}
      <div className="w-full lg:w-72 xl:w-80 shrink-0">
        <InventoryPanel />
      </div>

    </div>
  );
}




