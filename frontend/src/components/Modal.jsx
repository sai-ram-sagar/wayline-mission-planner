import { useEffect } from 'react';
import { TbX } from 'react-icons/tb';

/**
 * Lightweight centred dialog. Closes on Escape and on backdrop click, and
 * locks page scroll while open. Used instead of window.confirm/prompt so the
 * chrome matches the rest of the app and the flow stays testable.
 */
export default function Modal({ open, title, onClose, children, footer, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] grid place-items-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`panel w-full ${width} shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-600 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-slate-400 hover:bg-panel-600 hover:text-slate-100"
          >
            <TbX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-panel-600 px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Modal preset for destructive confirmations. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-300">{message}</p>
    </Modal>
  );
}
