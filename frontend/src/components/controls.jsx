import { useState } from 'react';
import { TbChevronDown, TbInfoCircle } from 'react-icons/tb';

/** Small "i" that reveals an explanatory tooltip on hover or focus. */
export function Hint({ text }) {
  if (!text) return null;
  return (
    <span className="group relative inline-flex align-middle">
      <TbInfoCircle
        className="h-3.5 w-3.5 cursor-help text-slate-500 hover:text-slate-300"
        tabIndex={0}
        aria-label={text}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-5 z-50 w-56 -translate-x-1/2 rounded
                   border border-panel-500 bg-panel-900 px-2 py-1.5 text-[11px] leading-snug
                   text-slate-300 opacity-0 shadow-xl transition-opacity
                   group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function FieldLabel({ children, hint }) {
  return (
    <span className="mb-1 flex items-center gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{children}</span>
      <Hint text={hint} />
    </span>
  );
}

/** Mutually exclusive option row, e.g. ASL / ALT / AGL. */
export function Segmented({ label, hint, options, value, onChange }) {
  return (
    <div>
      {label && <FieldLabel hint={hint}>{label}</FieldLabel>}
      <div className="segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={[
              'segmented-option',
              value === option.value ? 'segmented-option-on' : 'segmented-option-off',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LabeledSelect({ label, hint, options, value, onChange, disabled }) {
  const selected = options.find((option) => option.value === value);
  return (
    <div>
      {label && <FieldLabel hint={hint}>{label}</FieldLabel>}
      <select
        className="input disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
      {selected?.hint && (
        <p className="mt-1 text-[11px] leading-snug text-slate-500">{selected.hint}</p>
      )}
    </div>
  );
}

const clamp = (value, min, max) => Math.min(Math.max(value, min ?? -Infinity), max ?? Infinity);

/**
 * Numeric field with a text input and stepper buttons.
 *
 * `steps` mirrors the reference's coarse/fine steppers — pass [100, 10] to get
 * -100 / -10 / +10 / +100 around the value, or [1] for a simple pair.
 */
export function NumberStepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  steps = [1],
  disabled,
  placeholder,
  allowEmpty = false,
}) {
  // Local text state lets the user type "-" or clear the box mid-edit without
  // the value being clobbered on every keystroke.
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (value === null || value === undefined ? '' : String(value));

  const commit = (raw) => {
    setDraft(null);
    if (raw.trim() === '') {
      if (allowEmpty) onChange(null);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(clamp(parsed, min, max));
  };

  const bump = (delta) => {
    const base = Number(value);
    onChange(clamp((Number.isFinite(base) ? base : 0) + delta, min, max));
  };

  return (
    <div>
      {label && <FieldLabel hint={hint}>{label}</FieldLabel>}
      <div className="flex items-stretch gap-1">
        {[...steps].sort((a, b) => b - a).map((amount) => (
          <button
            key={`down-${amount}`}
            type="button"
            disabled={disabled}
            onClick={() => bump(-amount)}
            className="btn-ghost min-w-[2.4rem] px-1.5 py-1 font-mono text-[11px]"
            aria-label={`Decrease ${label ?? 'value'} by ${amount}`}
          >
            -{amount}
          </button>
        ))}

        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            className="input pr-8 text-center font-mono"
            value={shown}
            disabled={disabled}
            placeholder={placeholder}
            step={step}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setDraft(null);
            }}
          />
          {unit && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
              {unit}
            </span>
          )}
        </div>

        {[...steps].sort((a, b) => a - b).map((amount) => (
          <button
            key={`up-${amount}`}
            type="button"
            disabled={disabled}
            onClick={() => bump(amount)}
            className="btn-ghost min-w-[2.4rem] px-1.5 py-1 font-mono text-[11px]"
            aria-label={`Increase ${label ?? 'value'} by ${amount}`}
          >
            +{amount}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Collapsible section, matching the reference's grouped settings panels. */
export function Collapsible({ title, defaultOpen = true, children, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-panel-700">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold
                     uppercase tracking-wide text-slate-300 hover:bg-panel-700"
        >
          <TbChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          {title}
        </button>
        {right && <div className="pr-2">{right}</div>}
      </div>
      {open && <div className="space-y-3 px-3 pb-3">{children}</div>}
    </section>
  );
}
