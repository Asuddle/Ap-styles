import { useRef, type KeyboardEvent } from 'react'

export interface Opt { value: string; label: string; swatch?: string; disabled?: string | null; sub?: string }

/**
 * Accessible chip row (radiogroup, roving tabindex).
 * Arrow keys move focus; Enter or Space selects ("swaps"). Disabled chips stay focusable and say why.
 */
export function RadioRow({
  label, options, value, onChange, className = '',
}: { label: string; options: Opt[]; value: string | null; onChange: (v: string) => void; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const cur = Math.max(0, options.findIndex((o) => o.value === value))
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (d) {
      e.preventDefault()
      const j = (i + d + options.length) % options.length
      refs.current[j]?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!options[i].disabled) onChange(options[i].value)
    }
  }
  return (
    <div className={`radio-row ${className}`}>
      <span className="mono label row-label" id={`rl-${label}`}>{label}</span>
      <div role="radiogroup" aria-labelledby={`rl-${label}`} className="chips">
        {options.map((o, i) => (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el }}
            role="radio"
            aria-checked={o.value === value}
            aria-disabled={!!o.disabled}
            aria-describedby={o.disabled ? `why-${label}-${o.value}` : undefined}
            tabIndex={i === cur ? 0 : -1}
            className={`chip${o.value === value ? ' on' : ''}${o.disabled ? ' off' : ''}`}
            onClick={() => { if (!o.disabled) onChange(o.value) }}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.swatch && <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />}
            <span>{o.label}</span>
            {o.sub && <span className="chip-sub mono">{o.sub}</span>}
            {o.disabled && <span id={`why-${label}-${o.value}`} className="chip-why mono">{o.disabled}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
