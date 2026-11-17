export function formatDate(value, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return '';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', opts);
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export const DEFAULT_WHATSAPP = '2348129971991';

/** Load Instagram's embed script once, then render any embeds on the page. */
export function processInstagramEmbeds() {
  if (window.instgrm?.Embeds) {
    window.instgrm.Embeds.process();
    return;
  }
  if (document.getElementById('ig-embed-script')) return;
  const s = document.createElement('script');
  s.id = 'ig-embed-script';
  s.async = true;
  s.src = 'https://www.instagram.com/embed.js';
  s.onload = () => window.instgrm?.Embeds.process();
  document.body.appendChild(s);
}

/** Turn a Nigerian or international number into a wa.me link. */
export function whatsappLink(number, text) {
  if (!number) return null;
  let digits = String(number).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) digits = '234' + digits.slice(1);
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${q}`;
}

/** Normalise what was scanned or typed into a code like MH-ABC234. */
export function normaliseCode(raw) {
  let s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s) return '';
  const m = s.match(/MH-?[A-Z0-9]{6}/);
  if (m) s = m[0];
  if (/^[A-Z0-9]{6}$/.test(s)) s = 'MH-' + s;
  if (/^MH[A-Z0-9]{6}$/.test(s)) s = 'MH-' + s.slice(2);
  return s;
}

export function downloadCsv(filename, rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(c.value(r))).join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Shrink a photo before upload so the site stays fast on mobile data. */
export async function resizeImage(file, max = 1800, quality = 0.85) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bmp, 0, 0, width, height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return { blob, width, height };
}

/** Programme times are entered in Nigeria time (WAT, UTC+1, no daylight saving). */
export const EVENT_UTC_OFFSET = '+01:00';

function eventMoment(date, time) {
  if (!date) return null;
  const d = new Date(`${date}T${String(time).slice(0, 5)}:00${EVENT_UTC_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** When the programme starts. With no start time set, the start of that day. */
export const eventStart = (c) => eventMoment(c?.event_date, c?.start_time || '00:00');

/** When the programme is over. With no end time set, the end of that day. */
export function eventEnd(c) {
  const end = eventMoment(c?.event_date, c?.end_time || '23:59');
  const start = eventStart(c);
  return end && start && end <= start ? eventMoment(c.event_date, '23:59') : end;
}

/** "09:00:00" -> "9:00 am" */
export function formatTime(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`;
}

/** The time line shown to visitors, e.g. "9:00 am – 4:00 pm (WAT)". */
export function eventTimeText(c) {
  if (!c?.start_time) return c?.time_text || '';
  const end = c.end_time ? ` – ${formatTime(c.end_time)}` : '';
  return `${formatTime(c.start_time)}${end} (WAT)`;
}
