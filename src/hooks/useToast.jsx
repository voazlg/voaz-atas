import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((msg, duration = 2500) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  function ToastContainer() {
    return (
      <>
        {toasts.map((t, i) => (
          <div key={t.id} className="toast" style={{ bottom: 24 + i * 52 }}>
            {t.msg}
          </div>
        ))}
      </>
    )
  }

  return { showToast, ToastContainer }
}
