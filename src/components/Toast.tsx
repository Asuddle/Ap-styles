import { useEffect } from 'react'
import { useUI } from '../state/store'

export function Toast() {
  const toast = useUI((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useUI.getState().set({ toast: null }), 3200)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <div className="toast mono" role="status" aria-live="polite">
      {toast}
    </div>
  )
}
