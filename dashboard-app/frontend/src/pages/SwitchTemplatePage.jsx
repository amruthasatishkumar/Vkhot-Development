import { useState } from 'react';

// ── Spinner helper ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Detail view shown after template is created & fetched ─────────────────────
function TemplateDetailView({ template, onBack }) {
  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-4 shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-teal-100 hover:text-white mb-1 flex items-center gap-1 transition-colors"
        >
          ← Back to Switch Template
        </button>
        <p className="text-lg font-bold text-white tracking-tight">📋 {template.name}</p>
        <p className="text-sm text-teal-100 mt-0.5">Org-level network template — configure settings below.</p>
      </div>

      {/* Template info card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Template Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Name</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-100">{template.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Template ID</dt>
            <dd className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all">{template.id}</dd>
          </div>
          {template.org_id && (
            <div>
              <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Org ID</dt>
              <dd className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all">{template.org_id}</dd>
            </div>
          )}
          {template.created_time && (
            <div>
              <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Created</dt>
              <dd className="text-gray-600 dark:text-gray-300">
                {new Date(template.created_time * 1000).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Configuration placeholder — future steps added here */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Configuration</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Additional configuration options (bulk networks, RADIUS, NTP, syslog, ACL policies…) will appear here.
        </p>
      </div>

    </div>
  );
}

// ── Create form view ──────────────────────────────────────────────────────────
function CreateTemplateView({ onCreated }) {
  const [name,     setName]     = useState('');
  const [nameErr,  setNameErr]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setNameErr('');
    setApiError('');

    if (!name.trim()) {
      setNameErr('Template name is required.');
      return;
    }

    setLoading(true);
    try {
      // Step 1 — create template
      const createRes = await fetch('/api/switch-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to create template.');

      // Step 2 — fetch full template details using the returned ID
      const getRes = await fetch(`/api/switch-templates/${created.id}`);
      const full   = await getRes.json();
      if (!getRes.ok) throw new Error(full.error || 'Template created but could not fetch details.');

      onCreated(full);
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
            {loading ? (<><Spinner /> Creating &amp; fetching…</>) : 'Create Template'}
          </button>
        </form>

        {apiError && (
          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{apiError}</p>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Root component — toggles between create and detail view ───────────────────
export default function SwitchTemplatePage() {
  const [activeTemplate, setActiveTemplate] = useState(null);

  if (activeTemplate) {
    return <TemplateDetailView template={activeTemplate} onBack={() => setActiveTemplate(null)} />;
  }

  return <CreateTemplateView onCreated={setActiveTemplate} />;
}
