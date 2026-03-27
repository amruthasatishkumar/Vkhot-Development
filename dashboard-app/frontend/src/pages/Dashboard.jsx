import { useState } from 'react';

const MAC_REGEX = /^([0-9a-fA-F]{2}[:\-]?){5}[0-9a-fA-F]{2}$/;

export default function Dashboard() {
  const [mac,        setMac]        = useState('');
  const [vlanCount,  setVlanCount]  = useState('');
  const [macError,   setMacError]   = useState('');
  const [countError, setCountError] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [apiError,   setApiError]   = useState('');

  function validateMac(value) {
    if (!value.trim()) return 'MAC address is required.';
    if (!MAC_REGEX.test(value.trim())) return 'Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.';
    return '';
  }

  function validateCount(value) {
    const n = parseInt(value);
    if (!value) return 'VLAN count is required.';
    if (isNaN(n) || n < 1) return 'Must be at least 1.';
    if (n > 4000) return 'Maximum 4000 VLANs per request.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const macErr   = validateMac(mac);
    const countErr = validateCount(vlanCount);
    if (macErr)   setMacError(macErr);
    if (countErr) setCountError(countErr);
    if (macErr || countErr) return;

    setMacError('');
    setCountError('');
    setApiError('');
    setResult(null);
    setLoading(true);

    try {
      const res  = await fetch('/api/networks/provision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim(), count: parseInt(vlanCount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || 'An unexpected error occurred.');
      } else {
        setResult(data);
      }
    } catch {
      setApiError('Could not reach the backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Networks</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* MAC Input Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Provision VLANs on a Juniper Switch</h2>
        <p className="text-sm text-gray-500 mb-5">
          Enter a switch MAC address and the number of VLANs to create on that device.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* MAC Address */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Switch MAC Address</label>
              <input
                type="text"
                placeholder="e.g. AA:BB:CC:DD:EE:FF"
                value={mac}
                onChange={(e) => { setMac(e.target.value); setMacError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-brand-500
                  ${macError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
            </div>

            {/* VLAN Count */}
            <div className="w-full sm:w-40">
              <label className="block text-xs font-semibold text-gray-500 mb-1">VLAN Count (1–4000)</label>
              <input
                type="number"
                min="1"
                max="4000"
                placeholder="e.g. 10"
                value={vlanCount}
                onChange={(e) => { setVlanCount(e.target.value); setCountError(''); }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-500
                  ${countError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              {countError && <p className="text-xs text-red-500 mt-1">{countError}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50
                       text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Provisioning…' : 'Provision Networks'}
          </button>
        </form>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Switch info */}
          <div className="bg-brand-50 border border-brand-500/20 rounded-xl px-5 py-4 text-sm">
            <p className="font-semibold text-brand-700">Switch found ✓</p>
            <p className="text-gray-600 mt-0.5">
              <span className="font-medium">Name:</span> {result.switch.name} &nbsp;·&nbsp;
              <span className="font-medium">MAC:</span> {result.switch.mac} &nbsp;·&nbsp;
              <span className="font-medium">Site ID:</span> {result.switch.site_id}
            </p>
          </div>

          {/* Created VLANs table */}
          {result.created.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {result.created.length} VLANs Created
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">VLAN ID</th>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Subnet</th>
                    <th className="text-left px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.created.map((v) => (
                    <tr key={v.id || v.vlan_id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-gray-700">{v.vlan_id}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{v.name}</td>
                      <td className="px-5 py-3 font-mono text-gray-600">{v.subnet}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          ✓ Created
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Failed VLANs */}
          {result.failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
              <p className="font-semibold mb-2">Failed to create {result.failed.length} VLAN(s):</p>
              <ul className="list-disc list-inside space-y-1">
                {result.failed.map((f, i) => (
                  <li key={i}><span className="font-medium">{f.vlan}</span>: {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
