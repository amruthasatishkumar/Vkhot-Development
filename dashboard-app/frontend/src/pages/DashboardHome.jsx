const CARDS = [
  {
    page:        'networks',
    icon:        '🌐',
    title:       'Networks & Port Profiles',
    description: 'Bulk-create VLANs, port profiles and assign ports to switches in one flow.',
    badge:       'Configuration',
    stat:        'VLANs · Profiles · Ports',
    gradient:    'from-violet-500 to-purple-700',
    ring:        'ring-violet-300 dark:ring-violet-700',
    badgeBg:     'bg-white/20',
    dot:         'bg-violet-200',
  },
  {
    page:        'bounce-port',
    icon:        '🔄',
    title:       'Bounce Port',
    description: 'Cycle switch ports down and back up to force connected devices to re-negotiate.',
    badge:       'Operations',
    stat:        'Port Cycling · Live Status',
    gradient:    'from-teal-400 to-cyan-600',
    ring:        'ring-teal-300 dark:ring-teal-700',
    badgeBg:     'bg-white/20',
    dot:         'bg-teal-200',
  },
  {
    page:        'virtual-chassis',
    icon:        '🔗',
    title:       'Virtual Chassis',
    description: 'Automate VC provisioning, renumber members and manage routing-engine roles.',
    badge:       'Automation',
    stat:        'Preprovision · Renumber · Roles',
    gradient:    'from-orange-400 to-rose-500',
    ring:        'ring-orange-300 dark:ring-orange-700',
    badgeBg:     'bg-white/20',
    dot:         'bg-orange-200',
  },
];

export default function DashboardHome({ onNavigate }) {
  return (
    <div className="space-y-8 max-w-4xl">

      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 px-8 py-7 shadow-lg relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-white/10 blur-xl" />
        <p className="text-2xl font-extrabold text-white tracking-tight relative">My Automation World</p>
        <p className="text-sm text-indigo-200 mt-1 relative">
          Pick a tool below to get started — everything you need is one click away.
        </p>
      </div>

      {/* Section label */}
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
          Quick Access
        </p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {CARDS.map(({ page, icon, title, description, badge, stat, gradient, ring, badgeBg, dot }) => (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              className={`group relative w-full text-left rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-lg ring-2 ${ring} ring-offset-2 dark:ring-offset-gray-950 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98] transition-all duration-200 overflow-hidden`}
            >
              {/* Decorative circle */}
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/10" />

              {/* Badge */}
              <span className={`inline-block ${badgeBg} text-white/90 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 relative`}>
                {badge}
              </span>

              {/* Icon */}
              <div className="text-4xl mb-3 relative">{icon}</div>

              {/* Title */}
              <p className="text-base font-bold text-white leading-snug relative">{title}</p>

              {/* Description */}
              <p className="text-xs text-white/75 mt-1.5 leading-relaxed relative">{description}</p>

              {/* Stat strip */}
              <div className="mt-4 flex items-center gap-2 relative">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span className="text-xs text-white/60 font-medium">{stat}</span>
                <span className="ml-auto text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-200 text-base leading-none">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

