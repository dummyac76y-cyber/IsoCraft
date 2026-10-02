import React from 'react';
import { PixelIcon, PixelIconName } from './PixelIcon';

interface PixelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: PixelIconName;
  /** Tailwind width class for the frame, e.g. `max-w-3xl`. */
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
}

/**
 * The one modal shell. The frame is a 2px pixel outline with cut corners, the
 * body scrolls independently of the header and footer, and Escape closes.
 */
export function PixelModal({
  isOpen, onClose, title, subtitle, icon = 'book', width = 'max-w-2xl', children, footer, scroll = true
}: PixelModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="px-scrim" onContextMenu={e => e.preventDefault()}>
      <div className={`px-modal ${width}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="px-modal__body">
          <div className="px-modal__head">
            <span className="px-avatar" style={{ color: 'var(--px-gold)' }} aria-hidden>
              <PixelIcon name={icon} size={14} />
            </span>
            <div className="min-w-0">
              <h2 className="px-title truncate">{title}</h2>
              {subtitle && <p className="px-label mt-0.5 truncate">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="px-icon-btn ml-auto"
              onClick={onClose}
              aria-label="Close (Esc)"
            >
              <PixelIcon name="close" size={11} />
            </button>
          </div>

          {scroll ? <div className="px-modal__scroll">{children}</div> : children}

          {footer && <div className="px-modal__foot">{footer}</div>}
        </div>
      </div>
    </div>
  );
}