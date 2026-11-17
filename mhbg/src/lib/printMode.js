import { useCallback, useState } from 'react';

// Each phone or laptop remembers its own printing choice.
//   off     : scan only; "Print tag" button still available
//   local   : print here straight after this device checks someone in
//   station : print every check-in from every device (the laptop next to the printer)
const KEY = 'mhbg-print-mode';
export const PRINT_MODES = {
  off: 'Don’t print on this device (scan only)',
  local: 'Print here when I check someone in',
  station: 'Print station: print every check-in from all devices',
};

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return v in PRINT_MODES ? v : 'off';
  } catch {
    return 'off';
  }
}

export function usePrintMode() {
  const [mode, setModeState] = useState(read);
  const setMode = useCallback((m) => {
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch { /* private mode: keep for this visit only */ }
  }, []);
  return [mode, setMode];
}
