import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

function createToastManager() {
  let nextId = 1
  let items = []
  const listeners = new Set()
  const emit = () => listeners.forEach((listener) => listener())
  return {
    add(item) {
      const id = nextId++
      items = [...items, { ...item, id, createdAt: Date.now() }]
      emit()
      return id
    },
    getSnapshot: () => items,
    remove(id) {
      items = items.filter((item) => item.id !== id)
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  };
}
export const ToastPrimitive = { createToastManager }
export function ToastProvider({
  children,
  limit = 3,
  portalProps,
  timeout = 5000,
  toastManager,
  viewportProps
}) {
  const items = React.useSyncExternalStore(
    toastManager.subscribe,
    toastManager.getSnapshot,
    toastManager.getSnapshot
  )
  React.useEffect(() => {
    const timers = items.map((item) =>
      window.setTimeout(
        () => toastManager.remove(item.id),
        Math.max(0, item.createdAt + timeout - Date.now())
      )
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [items, limit, timeout, toastManager])
  const viewport = (
    <div
      {...viewportProps}
      className={cn(
        "pointer-events-none absolute right-3 bottom-3 z-50 flex w-80 max-w-[calc(100%-1.5rem)] flex-col gap-2",
        viewportProps?.className
      )}
    >
      {items.slice(-limit).map((item) => (
        <div
          key={item.id}
          role={item.type === "error" ? "alert" : "status"}
          className="pointer-events-auto rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg"
        >
          {item.title}
        </div>
      ))}
    </div>
  )
  const container = portalProps?.container
  return (
    <>
      {children}
      {container ? createPortal(viewport, container) : viewport}
    </>
  )
}
