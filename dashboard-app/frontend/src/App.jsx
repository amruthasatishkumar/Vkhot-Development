import Dashboard from './pages/Dashboard.jsx';
import Sidebar from './components/Sidebar.jsx';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Dashboard />
      </main>
    </div>
  );
}
