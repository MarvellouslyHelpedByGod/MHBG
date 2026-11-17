import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../lib/SiteContext.jsx';
import { eventEnd, eventStart, eventTimeText, formatDate } from '../lib/utils.js';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Counts down to the active programme (Admin → Conference). Whenever a new
 * programme is created there, this picks it up by itself. It shows
 * "Happening now" during the event and disappears once it is over.
 */
export default function Countdown() {
  const { conference } = useSite();
  const start = eventStart(conference);
  const end = eventEnd(conference);
  const [now, setNow] = useState(() => Date.now());
  const endMs = end?.getTime();

  useEffect(() => {
    if (!endMs) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t > endMs) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [endMs]);

  if (!conference || !start || now > endMs) return null;

  const left = Math.max(0, Math.floor((start.getTime() - now) / 1000));
  const happening = left === 0;
  const cells = [
    [Math.floor(left / 86400), 'Days'],
    [pad(Math.floor((left % 86400) / 3600)), 'Hours'],
    [pad(Math.floor((left % 3600) / 60)), 'Mins'],
    [pad(left % 60), 'Secs'],
  ];
  const meta = [
    formatDate(conference.event_date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
    eventTimeText(conference),
    (conference.venue || '').split(',')[0].trim(),
  ].filter(Boolean);

  return (
    <aside className="countdown" aria-label={`Countdown to ${conference.title}`}>
      <p className="kicker">{happening ? 'Our programme' : 'Next programme'}</p>
      <p className="countdown-title">{conference.title}</p>
      <p className="countdown-meta">{meta.join(' · ')}</p>
      {happening ? (
        <p className="countdown-now">{conference.start_time ? 'Happening now' : 'Happening today'}</p>
      ) : (
        <div className="countdown-cells" role="timer">
          {cells.map(([n, label]) => (
            <div className="countdown-cell" key={label}>
              <span className="n">{n}</span>
              <span className="l">{label}</span>
            </div>
          ))}
        </div>
      )}
      <Link to={conference.registration_open && !happening ? '/conference#register' : '/conference'} className="countdown-link">
        {conference.registration_open && !happening ? 'Register now' : 'See the details'} →
      </Link>
    </aside>
  );
}
