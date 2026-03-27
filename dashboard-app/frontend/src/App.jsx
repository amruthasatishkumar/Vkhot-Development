import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import BouncePortPage from './pages/BouncePortPage.jsx';
import Sidebar from './components/Sidebar.jsx';

export default function App() {
  const [dark,         setDark]         = useState(() => localStorage.getItem('theme') === 'dark');
  const [page,         setPage]         = useState('dashboard');
  const [bounceActive, setBounceActive] = useState(false);

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
      <Sidebar dark={dark} onToggleDark={() => setDark((d) => !d)} activePage={page} onNavigate={setPage} bounceActive={bounceActive} />
      <main className="flex-1 overflow-y-auto p-8">
        {/* Both pages stay mounted so bounce intervals survive navigation */}
        <div className={page !== 'dashboard'   ? 'hidden' : ''}><Dashboard /></div>
        <div className={page !== 'bounce-port' ? 'hidden' : ''}><BouncePortPage onBounceStatusChange={setBounceActive} /></div>
      </main>
    </div>
  );
}
