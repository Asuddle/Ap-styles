import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { useUI, type SectionId } from '../state/store'
import { scrollToSection } from '../motion/scroll'

/**
 * Pinned stages are fixed layers shown while their section is active (0.3 s ap.cut swap).
 * They stay in DOM order; focusing anything inside scrolls the tour to that section,
 * so keyboard and screen-reader users can move through the whole story.
 */
export function useStage(id: SectionId, ref: RefObject<HTMLElement | null>, focusP = 0.5, also: SectionId[] = []) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = (sec: SectionId, instant = false) => {
      const on = sec === id || also.includes(sec)
      el.classList.toggle('is-active', on)
      gsap.to(el, { opacity: on ? 1 : 0, duration: instant ? 0 : 0.3, ease: 'ap.cut', overwrite: 'auto' })
    }
    apply(useUI.getState().section, true)
    const unsub = useUI.subscribe((s, prev) => { if (s.section !== prev.section) apply(s.section) })
    const onFocus = () => {
      const sec = useUI.getState().section
      if (sec !== id && !also.includes(sec) && !useUI.getState().inspect) scrollToSection(id, focusP, true)
    }
    el.addEventListener('focusin', onFocus)
    return () => { unsub(); el.removeEventListener('focusin', onFocus) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
}
