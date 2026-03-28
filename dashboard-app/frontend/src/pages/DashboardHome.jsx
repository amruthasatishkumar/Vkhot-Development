const CARDS = [
  { page: 'networks',        icon: '🌐', title: 'Networks & Port Profiles' },
  { page: 'bounce-port',     icon: '🔄', title: 'Bounce Ports'             },
  { page: 'virtual-chassis', icon: '🔗', title: 'Virtual Chassis'          },
];

export default function DashboardHome({ onNavigate }) {
  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select a tool to get started.</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {CARDS.map(({ page, icon, title }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className="group w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-600 active:scale-[0.98] transition-all duration-150 p-6 flex flex-col items-start gap-4"
          >
            <span className="text-3xl">{icon}</span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug">
              {title}
            </p>
            <span className="mt-auto text-xs text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-400 group-hover:translate-x-1 transition-all duration-150">
              Open →
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}


