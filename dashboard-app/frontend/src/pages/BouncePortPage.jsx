import { useState, useEffect, useRef } from 'react';

const MAC_REGEX = /^([0-9a-fA-F]{2}[:\-]?){5}[0-9a-fA-F]{2}$/;

// Format seconds as M:SS
function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Format ISO timestamp to HH:MM:SS
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
}

export default function BouncePortPage() {
  // Discovery state
  const [mac,          setMac]          = useState('');
  const [macError,     setMacError]     = useState('');
  const [discovering,  setDiscovering]  = useState(false);
  const [discoverErr,  setDiscoverErr]  = useState('');
  const [switchInfo,   setSwitchInfo]   = useState(null);   // { id, site_id, name, mac }
  const [ports,        setPorts]        = useState([]);     // [{ port_id }]

  // Config
  const [duration,     setDuration]     = useState('10');  // minutes
  const [interval,     setInterval_]    = useState('30');  // seconds

  // Run state
  const [status,       setStatus]       = useState('idle'); // idle | ready | running | stopped
  const [countdown,    setCountdown]    = useState(0);      // seconds remaining
  const [bounceCount,  setBounceCount]  = useState(0);
  const [lastBounce,   setLastBounce]   = useState(null);   // ISO timestamp
  const [log,          setLog]          = useState([]);     // [{ ts, bounced, error? }]
  const [bounceErr,    setBounceErr]    = useState('');

  const bounceInterval = useRef(null);
  const countdownTimer = useRef(null);
  const endTimeRef     = useRef(null);
  const portsRef       = useRef([]);
  const switchRef      = useRef(null);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(bounceInterval.current);
    clearInterval(countdownTimer.current);
  }, []);

  // ── Discovery ──────────────────────────────────────────────────────────────

  async function handleDiscover(e) {
    e.preventDefault();
    if (!mac.trim()) { setMacError('MAC address is required.'); return; }
    if (!MAC_REGEX.test(mac.trim())) { setMacError('Invalid format. Use AA:BB:CC:DD:EE:FF or AABBCCDDEEFF.'); return; }

    setMacError('');
    setDiscoverErr('');
    setSwitchInfo(null);
    setPorts([]);
    setStatus('idle');
    setLog([]);
    setBounceCount(0);
    setLastBounce(null);
    setBounceErr('');
    setDiscovering(true);

    try {
      const res  = await fetch('/api/networks/bounce-discover', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mac: mac.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDiscoverErr(data.error || 'An unexpected error occurred.');
      } else {
        setSwitchInfo(data.switch);
        setPorts(data.ports);
        setStatus('ready');
      }
    } catch {
      setDiscoverErr('Could not reach the backend. Make sure it is running.');
    } finally {
      setDiscovering(false);
    }
  }

  // ── Bounce loop ────────────────────────────────────────────────────────────

  async function doBouce() {
    const sw = switchRef.current;
    const portIds = portsRef.current.map((p) => p.port_id);
    if (!sw || portIds.length === 0) return;

    try {
      const res  = await fetch('/api/networks/bounce-once', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ siteId: sw.site_id, deviceId: sw.id, portIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'Bounce failed.';
        setLog((prev) => [{ ts: new Date().toISOString(), bounced: 0, error: errMsg }, ...prev].slice(0, 20));
        setBounceErr(errMsg);
      } else {
        setLastBounce(data.timestamp);
        setBounceCount((c) => c + 1);
        setLog((prev) => [{ ts: data.timestamp, bounced: data.bounced }, ...prev].slice(0, 20));
        setBounceErr('');
      }
    } catch {
      const errMsg = 'Could not reach the backend.';
      setLog((prev) => [{ ts: new Date().toISOString(), bounced: 0, error: errMsg }, ...prev].slice(0, 20));
    }
  }

  function stopAll() {
    clearInterval(bounceInterval.current);
    clearInterval(countdownTimer.current);
    bounceInterval.current = null;
    countdownTimer.current = null;
    setStatus('stopped');
  }

  async function handleStart() {
    const durMins  = parseInt(duration);
    const intSecs  = parseInt(interval);
    if (isNaN(durMins) || durMins < 1 || durMins > 120) return;
    if (isNaN(intSecs) || intSecs < 5 || intSecs > 300) return;
    if (ports.length === 0) return;

    // Lock port list and switch at the moment of start
    portsRef.current  = ports;
    switchRef.current = switchInfo;

    const totalSecs = durMins * 60;
    endTimeRef.current = Date.now() + totalSecs * 1000;
    setCountdown(totalSecs);
    setBounceCount(0);
    setLastBounce(null);
    setLog([]);
    setBounceErr('');
    setStatus('running');

    // First bounce immediately
    await doBouce();

    // Bounce every `intSecs` seconds
    bounceInterval.current = setInterval(async () => {
      if (Date.now() >= endTimeRef.current) {
        stopAll();
        return;
      }
      await doBouce();
    }, intSecs * 1000);

    // Countdown ticks every second
    countdownTimer.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        stopAll();
      }
    }, 1000);
  }

  function handleStop() {
    stopAll();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const durNum = parseInt(duration);
  const intNum = parseInt(interval);
  const durValid = !isNaN(durNum) && durNum >= 1 && durNum <= 120;
  const intValid = !isNaN(intNum) && intNum >= 5 && intNum <= 300;
  const canStart = status === 'ready' && ports.length > 0 && durValid && intValid;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-4 shadow-md">
        <p className="text-lg font-bold text-white tracking-tight">🔄 Bounce Port</p>
        <p className="text-sm text-indigo-100 mt-0.5">Continuously bounce down ports on a staging switch for testing.</p>
      </div>

      {/* Discovery form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Find Eligible Ports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Enter a switch MAC to discover all down ports (VCP and uplink ports are automatically excluded).
        </p>
        <form onSubmit={handleDiscover} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="e.g. AA:BB:CC:DD:EE:FF"
              value={mac}
              onChange={(e) => { setMac(e.target.value); setMacError(''); }}
              disabled={status === 'running'}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100
                          dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                          disabled:opacity-50
                          ${macError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {macError && <p className="text-xs text-red-500 mt-1">{macError}</p>}
          </div>
          <button
            type="submit"
            disabled={discovering || status === 'running'}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {discovering ? 'Searching…' : 'Find Ports'}
          </button>
        </form>
      </div>

      {/* Discovery error */}
      {discoverErr && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {discoverErr}
        </div>
      )}

      {/* Switch info + port list */}
      {switchInfo && (
        <div className="space-y-4">
          <div className="bg-brand-50 dark:bg-indigo-900/30 border border-brand-500/20 dark:border-indigo-500/30 rounded-xl px-5 py-4 text-sm">
            <p className="font-semibold text-brand-700 dark:text-brand-400">Switch found ✓</p>
            <p className="text-gray-600 dark:text-gray-300 mt-0.5">
              <span className="font-medium">Name:</span> {switchInfo.name} &nbsp;·&nbsp;
              <span className="font-medium">MAC:</span> {switchInfo.mac} &nbsp;·&nbsp;
              <span className="font-medium">{ports.length} eligible down port{ports.length !== 1 ? 's' : ''}</span>
            </p>
          </div>

          {ports.length === 0 ? (
            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-5 py-4 text-sm text-yellow-700 dark:text-yellow-400">
              No eligible down ports found on this switch. All ports may be up, or only VCP/uplink/assigned ports are down.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Ports to Bounce ({ports.length})
                </p>
              </div>
              <div className="px-5 py-3 flex flex-wrap gap-2">
                {ports.map((p) => (
                  <span key={p.port_id}
                    className="inline-block px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                    {p.port_id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Config + Start/Stop — shown after discovery if ports exist */}
      {switchInfo && ports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Bounce Configuration</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Duration (minutes, 1–120)
              </label>
              <input
                type="number" min="1" max="120" value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={status === 'running'}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-700 dark:text-gray-100
                            focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50
                            ${!durValid && duration !== '' ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {!durValid && duration !== '' && (
                <p className="text-xs text-red-500 mt-1">Enter a value between 1 and 120.</p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Bounce Interval (seconds, 5–300)
              </label>
              <input
                type="number" min="5" max="300" value={interval}
                onChange={(e) => setInterval_(e.target.value)}
                disabled={status === 'running'}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-700 dark:text-gray-100
                            focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50
                            ${!intValid && interval !== '' ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {!intValid && interval !== '' && (
                <p className="text-xs text-red-500 mt-1">Enter a value between 5 and 300.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {status !== 'running' ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart && status !== 'stopped'}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ▶ Start Bouncing
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ⏹ Stop
              </button>
            )}
            {status === 'stopped' && (
              <button
                type="button"
                onClick={() => { setSwitchInfo(null); setPorts([]); setStatus('idle'); setLog([]); setBounceCount(0); setLastBounce(null); setBounceErr(''); }}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live status */}
      {(status === 'running' || status === 'stopped') && (
        <div className={`rounded-2xl border shadow-sm p-6 space-y-3
          ${status === 'running'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                {status === 'running' ? 'Running' : 'Stopped'}
              </p>
              <p className={`text-3xl font-mono font-bold
                ${status === 'running' ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatCountdown(countdown)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">remaining</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Bounces</p>
              <p className="text-3xl font-mono font-bold text-gray-800 dark:text-gray-100">{bounceCount}</p>
              {lastBounce && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last: {fmtTime(lastBounce)}</p>
              )}
            </div>
          </div>

          {bounceErr && (
            <div className="rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 px-4 py-2 text-xs text-red-700 dark:text-red-400">
              <strong>Bounce error:</strong> {bounceErr}
            </div>
          )}
        </div>
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Activity Log
            </p>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
            {log.map((entry, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="font-mono text-gray-400 dark:text-gray-500 text-xs">{fmtTime(entry.ts)}</span>
                {entry.error ? (
                  <span className="text-red-500 dark:text-red-400 text-xs">✗ {entry.error}</span>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                    ✓ Bounced {entry.bounced} port{entry.bounced !== 1 ? 's' : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
