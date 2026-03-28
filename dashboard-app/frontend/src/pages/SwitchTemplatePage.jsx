import { useState } from 'react';

export default function SwitchTemplatePage() {
  const [name,     setName]     = useState('');
  const [nameErr,  setNameErr]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);  // created template on success
  const [apiError, setApiError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setNameErr('');
    setApiError('');
    setResult(null);

    if (!name.trim()) {
      setNameErr('Template name is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/switch-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template.');
      setResult(data);
      setName('');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">📋 Switch Template</p>
        <p className="text-sm text-teal-100 mt-0.5">Create org-level network templates for your Juniper switches.</p>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Create Template</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Creates a new network template at the org level via the Mist API.
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(''); }}
              placeholder="e.g. Corp-Switch-Baseline"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {nameErr && <p className="mt-1 text-xs text-red-500">{nameErr}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating…
              </>
            ) : 'Create Template'}
          </button>
        </form>
      </div>

      {/* Success banner */}
      {result && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-5 py-4">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">✅ Template created successfully</p>
          <p className="text-sm text-green-600 dark:text-green-300 mt-1">
            <span className="font-medium">Name:</span> {result.name}
            {result.id && <> &nbsp;·&nbsp; <span className="font-medium">ID:</span> {result.id}</>}
          </p>
        </div>
      )}

      {/* Error banner */}
      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-5 py-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{apiError}</p>
        </div>
      )}

    </div>
  );
}
