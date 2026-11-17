import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lightbox from '../components/Lightbox.jsx';
import { useSite } from '../lib/SiteContext.jsx';
import { publicUrl, supabase } from '../lib/supabase.js';
import { processInstagramEmbeds } from '../lib/utils.js';

export default function Gallery() {
  const { settings } = useSite();
  const instagram = settings?.instagram_url || 'https://www.instagram.com/marvellouslyhelpedbygod';
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [metrics, setMetrics] = useState({ col: 0, gap: 11 });
  const [revealed, setRevealed] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    supabase
      .from('gallery_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) =>
        setItems((data || []).map((d) => ({ ...d, src: d.image_path ? publicUrl('gallery', d.image_path) : null })))
      );
  }, []);

  useEffect(() => {
    if (items?.some((i) => i.instagram_url)) processInstagramEmbeds();
  }, [items]);

  // Column width decides how many 10px rows each photo spans (masonry)
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const cs = getComputedStyle(grid);
      const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = parseFloat(cs.columnGap) || 11;
      setMetrics({ col: (grid.clientWidth - gap * (cols - 1)) / cols, gap });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [items]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || revealed) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setRevealed(true);
        io.disconnect();
      }
    }, { threshold: 0.05 });
    io.observe(grid);
    return () => io.disconnect();
  }, [items, revealed]);

  const span = (it) => {
    const ratio = it.width && it.height ? it.height / it.width : 0.75;
    if (!metrics.col) return 24;
    return Math.ceil((metrics.col * ratio + metrics.gap) / (10 + metrics.gap));
  };

  const photos = (items || []).filter((i) => i.src);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <section className="page-hero" id="gallery">
        <div className="wrap">
          <p className="kicker">Gallery</p>
          <h1>Moments from Marvellously Helped by God</h1>
          <p style={{ maxWidth: '60ch' }}>
            Faces, worship, laughter and the moments in between. See more on{' '}
            <a href={instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--dawn)' }}>our Instagram</a>.
          </p>
        </div>
      </section>
      <section className="section-dew">
        <div className="wrap">
          {items === null ? null : items.length === 0 ? (
            <div className="empty-state">
              No photos or reels yet. Follow us on{' '}
              <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a> in the meantime.
            </div>
          ) : (
            <div className="gallery-grid" ref={gridRef} data-revealed={revealed ? 'true' : 'false'}>
              {items.map((it, i) =>
                it.instagram_url ? (
                  <div className="ig-embed-cell" key={it.id}>
                    <blockquote
                      className="instagram-media"
                      data-instgrm-permalink={it.instagram_url}
                      data-instgrm-version="14"
                      style={{ margin: 0, width: '100%' }}
                    >
                      <a href={it.instagram_url} target="_blank" rel="noopener noreferrer">View on Instagram</a>
                    </blockquote>
                  </div>
                ) : (
                  <figure
                    key={it.id}
                    style={{ gridRowEnd: `span ${span(it)}`, animationDelay: `${Math.min(i, 16) * 45}ms` }}
                  >
                    <button
                      className="gallery-tile"
                      onClick={() => setOpen(photos.indexOf(it))}
                      aria-label={it.caption || `Open photo ${photos.indexOf(it) + 1}`}
                    >
                      <img src={it.src} alt={it.caption || ''} loading="lazy" />
                    </button>
                    {it.caption && <figcaption>{it.caption}</figcaption>}
                  </figure>
                )
              )}
            </div>
          )}
        </div>
      </section>
      <Lightbox items={photos} index={open} onClose={close} onIndex={setOpen} />
    </>
  );
}
