import { useEffect } from 'react';

export default function Lightbox({ items, index, onClose, onIndex }) {
  const open = index != null && items[index];

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, index, items.length, onClose, onIndex]);

  if (!open) return null;
  const item = items[index];

  return (
    <div
      className="lightbox open"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Close">×</button>
      {items.length > 1 && (
        <>
          <button className="lightbox-prev" aria-label="Previous photo" onClick={() => onIndex((index - 1 + items.length) % items.length)}>‹</button>
          <button className="lightbox-next" aria-label="Next photo" onClick={() => onIndex((index + 1) % items.length)}>›</button>
        </>
      )}
      <img src={item.src} alt={item.caption || ''} />
      <div className="lightbox-counter">
        {index + 1} / {items.length}
        {item.caption ? ` · ${item.caption}` : ''}
      </div>
    </div>
  );
}
