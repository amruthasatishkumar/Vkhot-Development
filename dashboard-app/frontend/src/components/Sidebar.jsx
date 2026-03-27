const NAV_ITEMS = [
  { label: 'Networks', icon: '🌐', href: '#' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-xl font-bold text-brand-600 tracking-tight">
          ◈ MyDashboard
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map(({ label, icon, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600
                       hover:bg-brand-50 hover:text-brand-700 transition-colors"
          >
            <span className="text-base">{icon}</span>
            {label}
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 text-xs text-gray-400">
        v1.0 · Local
      </div>
    </aside>
  );
}
