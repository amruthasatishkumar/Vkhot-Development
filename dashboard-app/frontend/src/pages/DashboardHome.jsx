const CARDS = [
  { page: 'networks',        icon: '🌐', title: 'Networks & Port Profiles' },
  { page: 'bounce-port',     icon: '🔄', title: 'Bounce Ports'             },
  { page: 'virtual-chassis', icon: '🔗', title: 'Virtual Chassis'          },
];

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
        {CARDS.map(({ page, title }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className="group w-full text-left bg-white dark:bg-amber-50 rounded-2xl border border-gray-100 dark:border-amber-100 shadow-sm hover:scale-[1.06] hover:shadow-2xl hover:border-brand-300 dark:hover:border-brand-400 active:scale-[0.97] transition-all duration-200 p-6 flex flex-col items-start gap-4"
          >
            <p className="text-base font-extrabold tracking-tight text-gray-900 group-hover:text-brand-600 dark:text-gray-900 dark:group-hover:text-brand-700 transition-colors leading-snug">
              {title}
            </p>
            <span className="mt-auto text-xs font-medium text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-200">
              Let's automate →
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}



