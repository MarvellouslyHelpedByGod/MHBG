import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Status from '../../components/Status.jsx';
import { useSite } from '../../lib/SiteContext.jsx';
import { PRINT_MODES, usePrintMode } from '../../lib/printMode.js';
import { supabase } from '../../lib/supabase.js';
import { printTag } from '../../lib/tags.js';
import { formatDateTime, normaliseCode } from '../../lib/utils.js';
import PrintStation from './PrintStation.jsx';
import QrScanner from './QrScanner.jsx';

export default function CheckIn({ role }) {
  const { conference } = useSite();
  const [printMode, setPrintMode] = usePrintMode();
  const [scanning, setScanning] = useState(false);
  const [voucher, setVoucher] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [walkIn, setWalkIn] = useState({ full_name: '', phone: '', organisation: '', category: '' });
  const [walkStatus, setWalkStatus] = useState(null);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState(null);
  const last = useRef({ code: '', t: 0 });

  // Search by name, phone or code for people without their code
  useEffect(() => {
    const term = q.trim().replace(/[,()*%\\]/g, ' ').trim();
    if (term.length < 2 || !conference) {
      setMatches(null);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('registrations')
        .select('*')
        .eq('conference_id', conference.id)
        .or(`full_name.ilike.*${term}*,phone.ilike.*${term}*,code.ilike.*${term}*`)
        .order('full_name')
        .limit(8);
      setMatches(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, conference]);

  if (!conference) {
    return (
      <div className="notice">
        There's no active conference.
        {role !== 'checkin' && <> <Link to="/admin/conference">Set one up first.</Link></>}
      </div>
    );
  }

  const mode = conference.checkin_mode || 'both';
  const cats = conference.categories?.length ? conference.categories : ['Participant'];

  /** Manual print or reprint: always prints on this device. */
  async function printHere(reg) {
    await printTag(reg, conference);
    await supabase.rpc('mark_tag_printed', { p_id: reg.id });
    setResult((r) => (r?.registration?.id === reg.id ? { ...r, registration: { ...r.registration, tag_printed_at: new Date().toISOString() } } : r));
  }

  /** After a check-in: print here only if this device is set to, and no other device has printed it. */
  async function autoPrint(reg) {
    if (printMode === 'off') return;
    const { data: mine } = await supabase.rpc('claim_tag_print', { p_id: reg.id });
    if (!mine) return;
    await printTag(reg, conference);
    setResult((r) => (r?.registration?.id === reg.id ? { ...r, registration: { ...r.registration, tag_printed_at: new Date().toISOString() } } : r));
  }

  async function checkIn(raw) {
    const code = normaliseCode(raw);
    if (!code) return;
    const now = Date.now();
    if (last.current.code === code && now - last.current.t < 4000) return; // same QR held in front of the camera
    last.current = { code, t: now };
    setBusy(true);
    const { data, error } = await supabase.rpc('check_in', { p_code: code });
    setBusy(false);
    if (error) {
      setResult({ status: 'error', message: error.message });
      return;
    }
    setResult(data);
    if (navigator.vibrate) navigator.vibrate(data.status === 'checked_in' ? 120 : [80, 60, 80]);
    if (data.status === 'checked_in') autoPrint(data.registration);
  }

  async function submitVoucher(e) {
    e.preventDefault();
    last.current = { code: '', t: 0 };
    await checkIn(voucher);
    setVoucher('');
  }

  async function checkInMatch(reg) {
    last.current = { code: '', t: 0 };
    await checkIn(reg.code);
    setQ('');
  }

  async function submitWalkIn(e) {
    e.preventDefault();
    setWalkStatus(null);
    if (!walkIn.full_name.trim()) {
      setWalkStatus({ type: 'error', msg: 'Enter the full name.' });
      return;
    }
    const { data, error } = await supabase.rpc('walk_in_register', {
      p_full_name: walkIn.full_name.trim(),
      p_phone: walkIn.phone.trim(),
      p_organisation: walkIn.organisation.trim() || null,
      p_category: walkIn.category || cats[0],
    });
    if (error) {
      setWalkStatus({ type: 'error', msg: error.message });
      return;
    }
    setResult(data);
    setWalkIn({ full_name: '', phone: '', organisation: '', category: '' });
    setWalkStatus({ type: 'success', msg: `${data.registration.full_name} registered and checked in.` });
    autoPrint(data.registration);
  }

  const reg = result?.registration;
  const printNote = {
    off: 'This device doesn’t print. Slips print on the print station, or tap “Print tag”.',
    local: 'Slips print on this device straight after each check-in.',
    station: 'This device prints slips for everyone checked in on any device.',
  }[printMode];

  return (
    <div>
      <div className="mini-form" style={{ marginTop: 0, marginBottom: '1.6rem', maxWidth: 640 }}>
        <label htmlFor="pmode" style={{ margin: 0 }}>Printing on this device</label>
        <select id="pmode" value={printMode} onChange={(e) => setPrintMode(e.target.value)}>
          {Object.entries(PRINT_MODES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <p className="form-hint" style={{ margin: 0 }}>{printNote} Each phone or laptop keeps its own setting.</p>
      </div>

      {printMode === 'station' && <PrintStation conference={conference} />}

      <div className="checkin-grid">
        <div>
          <h2>Check-in</h2>
          <p style={{ color: 'var(--ink-soft)' }}>
            {mode === 'qr' && 'Scan the QR code on each participant’s phone.'}
            {mode === 'voucher' && 'Type the voucher code each participant gives you.'}
            {mode === 'both' && 'Scan the QR code, or type the voucher code if they don’t have it on their phone.'}
          </p>

          {mode !== 'voucher' && (
            <div style={{ marginBottom: '1.4rem' }}>
              {scanning ? (
                <>
                  <QrScanner onScan={checkIn} />
                  <button className="btn btn-outline-dark btn-sm" style={{ marginTop: '.7rem' }} onClick={() => setScanning(false)}>
                    Stop camera
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => setScanning(true)}>Start QR scanner</button>
              )}
            </div>
          )}

          {mode !== 'qr' && (
            <form className="mini-form" onSubmit={submitVoucher} style={{ marginTop: 0 }}>
              <label htmlFor="voucher" style={{ margin: 0 }}>Voucher code</label>
              <input
                id="voucher"
                type="text"
                placeholder="e.g. MH-7K2QPA"
                autoCapitalize="characters"
                autoComplete="off"
                value={voucher}
                onChange={(e) => setVoucher(e.target.value)}
              />
              <div><button className="btn btn-primary btn-sm" disabled={busy || !voucher.trim()}>Check in</button></div>
            </form>
          )}

          {result && (
            <div className={`result ${result.status === 'checked_in' ? 'ok' : result.status === 'already' ? 'warn' : 'bad'}`} aria-live="polite">
              {result.status === 'checked_in' && <div className="label">Checked in</div>}
              {result.status === 'already' && <div className="label">Already checked in {formatDateTime(reg.checked_in_at)}</div>}
              {result.status === 'not_found' && (
                <>
                  <div className="label">Not found</div>
                  <div className="name">{result.code}</div>
                  <p>No registration has this code. Search by name below, or register them as a walk-in.</p>
                </>
              )}
              {result.status === 'error' && <p>{result.message}</p>}
              {reg && (
                <>
                  <div className="name">{reg.full_name}</div>
                  <p>
                    {[reg.category, reg.organisation].filter(Boolean).join(' · ')}
                    {reg.tag_printed_at ? ' · Slip printed' : ''}
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => printHere(reg)}>
                    {reg.tag_printed_at ? 'Reprint here' : 'Print tag here'}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mini-form" style={{ marginTop: '1.6rem' }}>
            <label htmlFor="find" style={{ margin: 0 }}>No code? Find them by name or phone</label>
            <input id="find" type="search" placeholder="Start typing a name or phone number" value={q} onChange={(e) => setQ(e.target.value)} />
            {matches && matches.length === 0 && <p className="form-hint" style={{ margin: 0 }}>No one found. Register them as a walk-in.</p>}
            {matches?.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.8rem', borderTop: '1px solid var(--paper-line)', paddingTop: '.6rem' }}>
                <div>
                  <strong>{m.full_name}</strong>
                  <div style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>
                    {m.phone} · {m.code}
                  </div>
                </div>
                {m.checked_in_at ? (
                  <span className="pill approved">Present</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => checkInMatch(m)}>Check in</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>Walk-in (not registered online)</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '.92rem' }}>Registers them and marks them present in one step.</p>
          <form className="mini-form" onSubmit={submitWalkIn} style={{ marginTop: 0 }}>
            <input type="text" placeholder="Full name" value={walkIn.full_name} onChange={(e) => setWalkIn((w) => ({ ...w, full_name: e.target.value }))} />
            <input type="tel" placeholder="Phone number" value={walkIn.phone} onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))} />
            <input type="text" placeholder="Church or organisation (optional)" value={walkIn.organisation} onChange={(e) => setWalkIn((w) => ({ ...w, organisation: e.target.value }))} />
            {cats.length > 1 && (
              <select value={walkIn.category || cats[0]} onChange={(e) => setWalkIn((w) => ({ ...w, category: e.target.value }))}>
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
            <div><button className="btn btn-outline-dark btn-sm">Register &amp; check in</button></div>
            <Status status={walkStatus} />
          </form>
        </div>
      </div>
    </div>
  );
}
