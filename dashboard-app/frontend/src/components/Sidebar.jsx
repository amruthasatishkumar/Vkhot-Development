const NAV_ITEMS = [
  { label: 'Networks & Port Profiles', icon: '🌐', page: 'dashboard' },
  { label: 'Bounce Port',              icon: '🔄', page: 'bounce-port' },
  { label: 'Virtual Chassis',          icon: '🔗', page: 'virtual-chassis' },
];

export default function Sidebar({ dark, onToggleDark, activePage, onNavigate, bounceActive }) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-bold text-brand-600 dark:text-brand-400 tracking-tight whitespace-nowrap">
          ◈ My Automation World
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map(({ label, icon, page }) => {
          const isActive = activePage === page;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(page)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                ${
                  isActive
                    ? 'bg-brand-50 dark:bg-gray-800 text-brand-700 dark:text-brand-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-gray-800 hover:text-brand-700 dark:hover:text-brand-400'
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
              {page === 'bounce-port' && bounceActive && (
                <span className="ml-auto h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Dark mode toggle */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onToggleDark}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
                     text-gray-600 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800
                     transition-colors"
        >
          <span>{dark ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
        v1.0 · Local
      </div>
    </aside>
  );
}
