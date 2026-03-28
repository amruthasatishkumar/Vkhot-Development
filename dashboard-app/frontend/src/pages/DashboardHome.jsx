const SHORTCUTS = [
  {
    page:        'networks',
    icon:        '🌐',
    title:       'Networks & Port Profiles',
    description: 'Create bulk VLANs, port profiles, and assign ports to switches.',
  },
  {
    page:        'bounce-port',
    icon:        '🔄',
    title:       'Bounce Port',
    description: 'Cycle down ports on a switch to refresh connected devices.',
  },
  {
    page:        'virtual-chassis',
    icon:        '🔗',
    title:       'Virtual Chassis',
    description: 'Automate Virtual Chassis provisioning and member role management.',
  },
];

export default function DashboardHome({ onNavigate }) {
  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-5 shadow-md">
        <p className="text-xl font-bold text-white tracking-tight">🏠 Dashboard</p>
        <p className="text-sm text-indigo-100 mt-1">
          Welcome to My Automation World. Select a tool to get started.
        </p>
      </div>

      {/* Shortcut cards */}
      <div className="grid grid-cols-1 gap-4">
        {SHORTCUTS.map(({ page, icon, title, description }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-start gap-4 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all group"
          >
            <span className="text-2xl mt-0.5">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
            <span className="text-gray-300 dark:text-gray-600 group-hover:text-brand-400 dark:group-hover:text-brand-400 transition-colors self-center">→</span>
          </button>
        ))}
      </div>

    </div>
  );
}
