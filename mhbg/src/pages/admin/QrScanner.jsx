import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan }) {
  const elId = 'qr-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5Qrcode(elId, { verbose: false });
    let started = false;
    let cancelled = false;
    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w, h) => {
            const s = Math.floor(Math.min(w, h) * 0.7);
            return { width: s, height: s };
          },
        },
        (text) => onScanRef.current(text),
        () => {}
      )
      .then(() => {
        started = true;
        if (cancelled) scanner.stop().then(() => scanner.clear()).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setError('The camera could not start. Allow camera access in your browser, or use the voucher code instead.');
      });
    return () => {
      cancelled = true;
      if (started) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [elId]);

  return (
    <div>
      <div id={elId} className="scanner-box" />
      {error && <div className="form-status error">{error}</div>}
    </div>
  );
}
