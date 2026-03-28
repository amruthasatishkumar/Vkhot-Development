import { useState } from 'react';

const NETWORKS_BACK_ITEMS = [
  'Bulk Networks',
  'Port Profiles',
  'Port Profile Assignment',
];

function FlipCard({ title, backItems, onClick }) {
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
            Here you can create:
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

export default function DashboardHome({ onNavigate }) {
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
          backItems={NETWORKS_BACK_ITEMS}
          onClick={() => onNavigate('networks')}
        />
        <PlainCard title="Bounce Ports"    onClick={() => onNavigate('bounce-port')} />
        <PlainCard title="Virtual Chassis" onClick={() => onNavigate('virtual-chassis')} />
      </div>

    </div>
  );
}




