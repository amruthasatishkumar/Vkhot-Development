import { useState, useEffect } from 'react';
import DashboardHome from './pages/DashboardHome.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BouncePortPage from './pages/BouncePortPage.jsx';
import VirtualChassisPage from './pages/VirtualChassisPage.jsx';
import Sidebar from './components/Sidebar.jsx';

const VALID_PAGES = ['home', 'networks', 'bounce-port', 'virtual-chassis'];

function pageFromHash() {
  const hash = window.location.hash.replace('#', '');
  return VALID_PAGES.includes(hash) ? hash : 'home';
}

export default function App() {
  const [dark,         setDark]         = useState(() => localStorage.getItem('theme') === 'dark');
  const [page,         setPage]         = useState(pageFromHash);
  const [bounceActive, setBounceActive] = useState(false);

  // Keep URL hash in sync when page changes
  function navigateTo(p) {
    window.location.hash = p;
    setPage(p);
  }

  // Handle browser back/forward
  useEffect(() => {
    function onHashChange() { setPage(pageFromHash()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
      <Sidebar dark={dark} onToggleDark={() => setDark((d) => !d)} activePage={page} onNavigate={navigateTo} bounceActive={bounceActive} />
      <main className="flex-1 overflow-y-auto p-8">
        {/* Both pages stay mounted so bounce intervals survive navigation */}
        <div className={page !== 'home'             ? 'hidden' : ''}><DashboardHome onNavigate={navigateTo} /></div>
        <div className={page !== 'networks'         ? 'hidden' : ''}><Dashboard /></div>
        <div className={page !== 'bounce-port'      ? 'hidden' : ''}><BouncePortPage onBounceStatusChange={setBounceActive} /></div>
        <div className={page !== 'virtual-chassis'  ? 'hidden' : ''}><VirtualChassisPage /></div>
      </main>
    </div>
  );
}
