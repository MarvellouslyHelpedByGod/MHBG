import QRCode from 'qrcode';

export const DEFAULT_TAG = {
  width_mm: 90,
  height_mm: 40,
  header_text: '',
  show_name: true,
  show_category: true,
  show_organisation: true,
  show_code: false,
  show_qr: false,
  name_size_pt: 20,
  align: 'center',
  text_color: '#14160f',
  background_url: '',
};

export function tagSettings(conference) {
  return { ...DEFAULT_TAG, ...(conference?.tag_settings || {}) };
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The full HTML for one sticky slip — used for both the live preview and printing. */
export async function slipHtml(reg, conference, overrides) {
  const t = { ...tagSettings(conference), ...(overrides || {}) };
  const qr = t.show_qr && reg.code ? await QRCode.toDataURL(reg.code, { margin: 0, width: 300 }) : '';
  const left = t.align === 'left';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(reg.full_name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560&display=swap" rel="stylesheet">
<style>
@page{size:${t.width_mm}mm ${t.height_mm}mm;margin:0}
html,body{margin:0;padding:0;background:#fff}
.slip{width:${t.width_mm}mm;height:${t.height_mm}mm;box-sizing:border-box;padding:3mm 4mm;display:flex;align-items:center;gap:3mm;
 justify-content:${left ? 'flex-start' : 'center'};text-align:${left ? 'left' : 'center'};
 font-family:Arial,'Helvetica Neue',sans-serif;color:${esc(t.text_color)};overflow:hidden;
 ${t.background_url ? `background:url('${esc(t.background_url)}') center/cover no-repeat;` : ''}
 -webkit-print-color-adjust:exact;print-color-adjust:exact}
.txt{flex:1;min-width:0}
.hd{font-size:7pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:1.2mm;opacity:.8}
.nm{font-family:Fraunces,Georgia,serif;font-weight:560;font-size:${Number(t.name_size_pt) || 20}pt;line-height:1.05;overflow-wrap:anywhere}
.ct{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-top:1.4mm}
.og{font-size:8.5pt;margin-top:.8mm}
.cd{font-size:7.5pt;margin-top:1mm;letter-spacing:.06em;font-family:Menlo,Consolas,monospace}
.qr{height:${Math.max(t.height_mm - 8, 10)}mm;width:auto;flex:none}
</style></head><body><div class="slip">
${left && qr ? `<img class="qr" src="${qr}" alt="">` : ''}
<div class="txt">
${t.header_text ? `<div class="hd">${esc(t.header_text)}</div>` : ''}
${t.show_name ? `<div class="nm">${esc(reg.full_name)}</div>` : ''}
${t.show_category && reg.category ? `<div class="ct">${esc(reg.category)}</div>` : ''}
${t.show_organisation && reg.organisation ? `<div class="og">${esc(reg.organisation)}</div>` : ''}
${t.show_code && reg.code ? `<div class="cd">${esc(reg.code)}</div>` : ''}
</div>
${!left && qr ? `<img class="qr" src="${qr}" alt="">` : ''}
</div></body></html>`;
}

let printChain = Promise.resolve();

/** Print one slip. Slips on a device print one after another, never on top of each other. */
export function printTag(reg, conference) {
  const job = printChain.then(() => printNow(reg, conference));
  printChain = job.catch(() => {});
  return job;
}

/** Print through a hidden frame (no pop-up blockers). */
async function printNow(reg, conference) {
  const html = await slipHtml(reg, conference);
  await new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    const ready = Promise.race([
      (async () => {
        if (doc.fonts) await doc.fonts.ready;
        await Promise.all(
          [...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))
        );
      })(),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    ready.then(() =>
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } finally {
          setTimeout(() => { iframe.remove(); resolve(); }, 1000);
        }
      }, 150)
    );
  });
}
