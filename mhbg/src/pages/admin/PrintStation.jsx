import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAll, supabase } from '../../lib/supabase.js';
import { printTag } from '../../lib/tags.js';

/**
 * Turns this device into the print station: every person checked in on ANY
 * device has their slip printed here, one at a time. A shared claim in the
 * database makes sure each slip prints exactly once, even with two stations.
 */
export default function PrintStation({ conference }) {
  const [live, setLive] = useState(false);
  const [printed, setPrinted] = useState([]);
  const [queued, setQueued] = useState(0);
  const [pending, setPending] = useState(0);
  const queue = useRef([]);
  const seen = useRef(new Set());
  const running = useRef(false);
  const alive = useRef(true);
  const confId = conference.id;

  const countPending = useCallback(async () => {
    const { count } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('conference_id', confId)
      .not('checked_in_at', 'is', null)
      .is('tag_printed_at', null);
    if (alive.current) setPending(count || 0);
  }, [confId]);

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (alive.current && queue.current.length) {
      const reg = queue.current.shift();
      setQueued(queue.current.length);
      const { data: mine } = await supabase.rpc('claim_tag_print', { p_id: reg.id });
      if (!mine) continue; // already printed somewhere else
      await printTag(reg, conference);
      if (alive.current) setPrinted((p) => [reg, ...p].slice(0, 6));
    }
    running.current = false;
    countPending();
  }, [conference, countPending]);

  const enqueue = useCallback(
    (reg) => {
      if (!reg.checked_in_at || reg.tag_printed_at || seen.current.has(reg.id)) return;
      seen.current.add(reg.id);
      queue.current.push(reg);
      setQueued(queue.current.length);
      drain();
    },
    [drain]
  );

  useEffect(() => {
    alive.current = true;
    countPending();
    const ch = supabase
      .channel(`print-station-${confId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, (payload) => {
        const row = payload.new;
        if (!row || row.conference_id !== confId) return;
        if (row.checked_in_at && !row.tag_printed_at) enqueue(row);
        else countPending();
      })
      .subscribe((s) => {
        setLive(s === 'SUBSCRIBED');
        if (s === 'SUBSCRIBED') countPending();
      });
    const timer = setInterval(countPending, 20000);
    return () => {
      alive.current = false;
      clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [confId, enqueue, countPending]);

  async function printPending() {
    const rows = await fetchAll(() =>
      supabase
        .from('registrations')
        .select('*')
        .eq('conference_id', confId)
        .not('checked_in_at', 'is', null)
        .is('tag_printed_at', null)
        .order('checked_in_at', { ascending: true })
    );
    rows.forEach(enqueue);
  }

  return (
    <div className="result ok" style={{ marginTop: 0, marginBottom: '1.4rem' }}>
      <span className={`live-dot${live ? '' : ' off'}`}>
        {live ? 'Print station on — slips from every device print here' : 'Reconnecting… slips you check in on this device still print'}
      </span>
      <p style={{ margin: '.6rem 0' }}>
        {printed.length ? `Last printed: ${printed.map((r) => r.full_name).join(', ')}` : 'Waiting for check-ins…'}
        {queued > 0 && ` · ${queued} waiting to print`}
      </p>
      {pending > 0 && (
        <button className="btn btn-outline-dark btn-sm" onClick={printPending}>
          Print {pending} checked-in {pending === 1 ? 'person' : 'people'} without a slip
        </button>
      )}
      <p className="form-hint" style={{ marginBottom: 0 }}>
        Keep this screen open on this device during check-in.
      </p>
    </div>
  );
}
