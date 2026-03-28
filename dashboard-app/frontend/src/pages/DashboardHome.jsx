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

function FlipCard({ title, backHeader, backItems, onClick }) {
  const [flipped, setFlipped] = useState(false);

  const faceBase = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '1rem',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      style={{
        perspective: '1000px',
        height: '160px',
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
          className="dark:!bg-amber-50"
          style={{ ...faceBase, backgroundColor: 'white', border: '1px solid #f3f4f6' }}
        >
          <p style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#111827', lineHeight: 1.3 }}>
            {title}
          </p>
          <span style={{ marginTop: 'auto', fontSize: '0.75rem', fontWeight: 500, color: '#9ca3af' }}>
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
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            {backHeader}
          </p>
          <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {backItems.map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'white', lineHeight: 1.4 }}>
                <span style={{ color: '#a5f3fc', flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
function DonutChart({ pct, color, trackColor = '#e5e7eb', size = 110 }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={trackColor} strokeWidth="11" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="19" fontWeight="800" fill={color}>
        {pct}%
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="9" fontWeight="500" fill="#9ca3af">
        complete
      </text>
    </svg>
  );
}

// ── Polling hook: reads live progress from storage every second ───────────────
function useRunsInProgress() {
  const [runs, setRuns] = useState([]);
  useEffect(() => {
    function read() {
      const result = [];

      // Bounce Port — localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('bounce_session'));
        if (saved && saved.endTime > Date.now()) {
          const totalSecs = saved.durationMins * 60;
          const remaining = Math.max(0, (saved.endTime - Date.now()) / 1000);
          const pct       = Math.min(99, Math.round(((totalSecs - remaining) / totalSecs) * 100));
          const remMins   = Math.floor(remaining / 60);
          const remSecs   = Math.round(remaining % 60);
          result.push({
            key:    'bounce',
            label:  'Bounce Port',
            sub:    saved.switchInfo?.name || 'Running',
            pct,
            detail: `${remMins}m ${String(remSecs).padStart(2, '0')}s remaining`,
            color:  '#10b981',
            track:  '#d1fae5',
          });
        }
      } catch { /* ignore */ }

      // VC Automation — sessionStorage
      try {
        const ran       = sessionStorage.getItem('vc:ran')       === 'true';
        const completed = sessionStorage.getItem('vc:completed') === 'true';
        if (ran && !completed) {
          const steps      = JSON.parse(sessionStorage.getItem('vc:steps')) || [];
          const done       = steps.filter((s) => s.ok !== null).length;
          const total      = Math.max(steps.length, 6);
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

// ── Runs In Progress section ─────────────────────────────────────────────────
function RunsInProgress({ runs, onNavigate }) {
  if (runs.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 tracking-tight">Runs in Progress</p>
        <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold">
          {runs.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {runs.map((run) => (
          <button
            key={run.key}
            type="button"
            onClick={() => onNavigate(run.key === 'bounce' ? 'bounce-port' : 'virtual-chassis')}
            className="group w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-600 transition-all duration-200 p-5 flex items-center gap-5"
          >
            <div className="flex-shrink-0">
              <DonutChart pct={run.pct} color={run.color} trackColor={run.track} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{run.label}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">{run.sub}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: run.color }} />
                <p className="text-xs font-semibold" style={{ color: run.color }}>{run.detail}</p>
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors">Click to view →</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome({ onNavigate }) {
  const runs = useRunsInProgress();
  return (
    <div className="space-y-8 max-w-3xl">

      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 px-8 py-7 shadow-lg relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-white/10 blur-xl" />
        <p className="text-2xl font-extrabold text-white tracking-tight relative">My Automation World</p>
        <p className="text-sm text-indigo-200 mt-1 relative">
          Pick a tool below to get started — everything you need is one click away.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      </div>

      {/* Runs in Progress */}
      <RunsInProgress runs={runs} onNavigate={onNavigate} />

    </div>
  );
}




