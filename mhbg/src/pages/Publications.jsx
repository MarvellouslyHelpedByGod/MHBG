import { useEffect, useState } from 'react';
import Reveal from '../components/Reveal.jsx';
import { publicUrl, supabase } from '../lib/supabase.js';
import { formatDate } from '../lib/utils.js';

export default function Publications() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    supabase
      .from('publications')
      .select('*')
      .eq('is_published', true)
      .order('published_on', { ascending: false, nullsFirst: false })
      .then(({ data }) => setItems(data || []));
  }, []);

  return (
    <>
      <section className="page-hero" id="publications">
        <div className="wrap">
          <p className="kicker">Publications</p>
          <h1>Reading &amp; resources</h1>
          <p style={{ maxWidth: '60ch' }}>Newsletters, devotionals and notes from the movement.</p>
        </div>
      </section>
      <section className="section-dew">
        <div className="wrap">
          {items === null ? null : items.length === 0 ? (
            <div className="empty-state">No publications yet — check back soon.</div>
          ) : (
            <div style={{ display: 'grid', gap: '1.6rem' }}>
              {items.map((p) => {
                const href = p.file_path ? publicUrl('publications', p.file_path) : p.link_url;
                return (
                  <Reveal as="article" className="publication-card" key={p.id}>
                    {p.published_on && <div className="date">{formatDate(p.published_on)}</div>}
                    <h3>{p.title}</h3>
                    {p.summary && <p>{p.summary}</p>}
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {p.file_path ? 'Download' : 'Read more'} →
                      </a>
                    )}
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
