import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard.jsx';

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const [metrics,  setMetrics]  = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/metrics').then((r) => r.json()),
      fetch('/api/activity').then((r) => r.json()),
    ])
      .then(([m, a]) => {
        setMetrics(m);
        setActivity(a);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 text-sm">
        <strong>Error:</strong> {error}
        <p className="mt-1 text-red-500">Make sure the backend is running on port 3001.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Networks</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-5xl mb-4">🌐</span>
        <h2 className="text-lg font-semibold text-gray-700">No networks yet</h2>
        <p className="text-sm text-gray-400 mt-1">Your network data will appear here once added.</p>
      </div>
    </div>
  );
}
