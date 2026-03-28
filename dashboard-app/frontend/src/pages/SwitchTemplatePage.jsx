import { useState } from 'react';

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Random network generator ──────────────────────────────────────────────────
function generateNetworks(count) {
  const usedIds     = new Set();
  const usedSubnets = new Set();
  const nets        = [];

  for (let i = 0; i < count; i++) {
    let vlanId;
    do { vlanId = Math.floor(Math.random() * 3900) + 100; } // 100–3999
    while (usedIds.has(vlanId));
    usedIds.add(vlanId);

    let subnet;
    do {
      const x = Math.floor(Math.random() * 254) + 1;
      const y = Math.floor(Math.random() * 255);
      subnet  = `10.${x}.${y}.0/24`;
    } while (usedSubnets.has(subnet));
    usedSubnets.add(subnet);

    nets.push({ name: `VLAN_${vlanId}`, vlan_id: vlanId, subnet });
  }
  return nets;
}

// ── Networks tab ──────────────────────────────────────────────────────────────
function NetworksTab({ templateId }) {
  const [count,     setCount]     = useState('');
  const [countErr,  setCountErr]  = useState('');
  const [generated, setGenerated] = useState([]);
  const [creating,  setCreating]  = useState(false);
  const [success,   setSuccess]   = useState(null);
  const [apiError,  setApiError]  = useState('');

  function handleGenerate() {
    setCountErr(''); setSuccess(null); setApiError('');
    const n = parseInt(count, 10);
    if (!count || isNaN(n) || n < 1 || n > 4000) {
      setCountErr('Enter a number between 1 and 4000.');
      return;
    }
    setGenerated(generateNetworks(n));
  }

  async function handleCreateNetworks() {
    setCreating(true); setApiError(''); setSuccess(null);
    try {
      const res = await fetch(`/api/switch-templates/${templateId}/networks`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ networks: generated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create networks.');
      setSuccess({ count: generated.length, names: generated.map((n) => n.name) });
      setGenerated([]); setCount('');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            How many networks to create?
          </label>
          <input
            type="number" min={1} max={4000} value={count}
            onChange={(e) => { setCount(e.target.value); setCountErr(''); setSuccess(null); setGenerated([]); }}
            placeholder="1 – 4000"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {countErr && <p className="mt-1 text-xs text-red-500">{countErr}</p>}
        </div>
        <button type="button" onClick={handleGenerate}
          className="rounded-lg bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 transition-colors">
          🎲 Generate
        </button>
      </div>

      {/* Preview table */}
      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Preview — {generated.length} network{generated.length > 1 ? 's' : ''}
            </p>
            <button type="button" onClick={handleGenerate}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
              ↺ Regenerate
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['VLAN Name', 'VLAN ID', 'IPv4 Subnet'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {generated.map((net) => (
                  <tr key={net.vlan_id} className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-100">{net.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-indigo-600 dark:text-indigo-400">{net.vlan_id}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{net.subnet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={handleCreateNetworks} disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
            {creating
              ? (<><Spinner /> Creating…</>)
              : `Create ${generated.length} Network${generated.length > 1 ? 's' : ''} in Template`}
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            ✅ {success.count} network{success.count > 1 ? 's' : ''} added to template
          </p>
          <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-mono break-all">
            {success.names.join(', ')}
          </p>
        </div>
      )}

      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{apiError}</p>
        </div>
      )}
    </div>
  );
}

// ── Template detail view ──────────────────────────────────────────────────────
function TemplateDetailView({ template, onBack }) {
  return (
    <div className="space-y-6 max-w-3xl">

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-4 shadow-md">
        <button type="button" onClick={onBack}
          className="text-xs text-teal-100 hover:text-white mb-1 flex items-center gap-1 transition-colors">
          ← Back to Switch Template
        </button>
        <p className="text-lg font-bold text-white tracking-tight">📋 {template.name}</p>
        <p className="text-sm text-teal-100 mt-0.5">Org-level network template — configure settings below.</p>
      </div>

      {/* Template info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Template Details</h2>
        <dl className="text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Name</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-100">{template.name}</dd>
          </div>
        </dl>
      </div>

      {/* Networks */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Networks</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Randomly generate VLAN networks and push them into this template.
        </p>
        <NetworksTab templateId={template.id} />
      </div>

    </div>
  );
}

// ── Create form view ──────────────────────────────────────────────────────────
function CreateTemplateView({ savedTemplates, onCreated, onSelectTemplate }) {
  const [name,     setName]     = useState('');
  const [nameErr,  setNameErr]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setNameErr(''); setApiError('');
    if (!name.trim()) { setNameErr('Template name is required.'); return; }

    setLoading(true);
    try {
      // Step 1 — create
      const createRes = await fetch('/api/switch-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to create template.');

      // Step 2 — fetch full details (includes _apiEndpoint)
      const getRes = await fetch(`/api/switch-templates/${created.id}`);
      const full   = await getRes.json();
      if (!getRes.ok) throw new Error(full.error || 'Template created but could not fetch details.');

      setName('');
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

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Create Template</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Creates a new network template at the org level via the Mist API.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
            <input
              type="text" value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(''); }}
              placeholder="e.g. Corp-Switch-Baseline"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {nameErr && <p className="mt-1 text-xs text-red-500">{nameErr}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 transition-colors">
            {loading ? (<><Spinner /> Creating…</>) : 'Create Template'}
          </button>
        </form>
        {apiError && (
          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">❌ Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{apiError}</p>
          </div>
        )}
      </div>

      {/* Previously created templates — click any to open */}
      {savedTemplates.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Your Templates ({savedTemplates.length})
          </p>
          <div className="space-y-2">
            {savedTemplates.map((t) => (
              <button key={t.id} type="button" onClick={() => onSelectTemplate(t)}
                className="w-full text-left rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md shadow-sm transition-all px-5 py-4 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{t.id}</p>
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 group-hover:text-teal-500 transition-colors text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Root — toggles between create and detail view ────────────────────────────
export default function SwitchTemplatePage() {
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('st:templates')) || []; } catch { return []; }
  });
  const [activeTemplate, setActiveTemplate] = useState(null);

  function handleCreated(template) {
    // Add to front of list, deduplicate by id
    const updated = [template, ...savedTemplates.filter((t) => t.id !== template.id)];
    sessionStorage.setItem('st:templates', JSON.stringify(updated));
    setSavedTemplates(updated);
    setActiveTemplate(template);
  }

  if (activeTemplate) {
    return <TemplateDetailView template={activeTemplate} onBack={() => setActiveTemplate(null)} />;
  }
  return (
    <CreateTemplateView
      savedTemplates={savedTemplates}
      onCreated={handleCreated}
      onSelectTemplate={setActiveTemplate}
    />
  );
}
