"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { overlayOpacity, shouldDismiss, startsDrag } from "@/lib/sheet-drag"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // Scrim más oscuro en mobile (patrón de hoja, design/admin-iphone
        // n-hojas: rgba(17,19,21,.45)) que en desktop, donde el diálogo
        // centrado ya tenía un scrim más sutil con blur.
        "fixed inset-0 isolate z-50 bg-[var(--hs-ink)]/45 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 sm:bg-black/10 sm:supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

/** Mismo corte que el `sm:` de abajo: por debajo, el diálogo es hoja inferior. */
const SHEET_QUERY = "(max-width: 639.98px)"

/** Campos donde el dedo selecciona o escribe: ahí el gesto no agarra la hoja. */
const NO_DRAG_SELECTOR = 'input, textarea, select, [contenteditable="true"], [data-sheet-no-drag]'

/** ¿Hay algo desplazado entre el dedo y la hoja? Entonces el gesto es para eso. */
function isScrolledBetween(target: Element | null, root: HTMLElement): boolean {
  for (let el = target; el && el !== root; el = el.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) return true
  }
  return false
}

/**
 * Cerrar la hoja deslizándola hacia abajo, como en las apps del celular.
 *
 * Solo en la presentación de hoja (mobile) y solo cuando su contenido está
 * arriba de todo: si la hoja (o una lista dentro) está desplazada, el dedo
 * sigue desplazándola como siempre. El arrastre sigue al dedo; al soltar,
 * `shouldDismiss` decide si se cierra o vuelve a su lugar. Para cerrar se
 * "toca" un `DialogClose` oculto, así funciona igual con diálogos
 * controlados (`open`/`onOpenChange`) y sin controlar.
 *
 * Se escucha `touchmove` a mano (no con `onTouchMove` de React) porque hace
 * falta `passive: false` para frenar el rebote del navegador mientras se
 * arrastra la hoja.
 */
function attachSheetDrag(sheet: HTMLElement, dismiss: () => void): () => void {
  let start: { x: number; y: number } | null = null
  let dragging = false
  let distance = 0
  let velocity = 0
  let last = { y: 0, t: 0 }

  const overlay = () => {
    const sibling = sheet.previousElementSibling
    return sibling instanceof HTMLElement && sibling.dataset.slot === "dialog-overlay" ? sibling : null
  }

  function reset() {
    start = null
    dragging = false
    distance = 0
    velocity = 0
  }

  function onStart(event: TouchEvent) {
    reset()
    if (event.touches.length !== 1 || !window.matchMedia(SHEET_QUERY).matches) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(NO_DRAG_SELECTOR) || isScrolledBetween(target, sheet)) return
    const touch = event.touches[0]
    start = { x: touch.clientX, y: touch.clientY }
    last = { y: touch.clientY, t: event.timeStamp }
  }

  function onMove(event: TouchEvent) {
    if (!start) return
    const touch = event.touches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    if (!dragging) {
      if (sheet.scrollTop > 0) {
        start = null
        return
      }
      if (!startsDrag(dx, dy)) {
        // Hacia arriba o de costado: el gesto es otra cosa, se suelta.
        if (dy < 0 || Math.abs(dx) > Math.abs(dy)) start = null
        return
      }
      dragging = true
      sheet.style.transition = "none"
      const backdrop = overlay()
      if (backdrop) backdrop.style.transition = "none"
    }

    event.preventDefault()
    const elapsed = event.timeStamp - last.t
    if (elapsed > 0) velocity = (touch.clientY - last.y) / elapsed
    last = { y: touch.clientY, t: event.timeStamp }

    distance = Math.max(0, dy)
    sheet.style.transform = `translateY(${distance}px)`
    const backdrop = overlay()
    if (backdrop) backdrop.style.opacity = String(overlayOpacity(distance, sheet.offsetHeight))
  }

  function onEnd() {
    const wasDragging = dragging
    const result = { distance, velocity, sheetHeight: sheet.offsetHeight }
    reset()
    if (!wasDragging) return

    if (shouldDismiss(result)) {
      // La transformación queda puesta: la animación de salida arranca desde
      // donde soltó el dedo, no desde arriba.
      dismiss()
      return
    }

    // Vuelve a su lugar. Con "Reducir movimiento", sin animación.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    sheet.style.transition = reduce ? "none" : "transform 200ms ease-out"
    sheet.style.transform = ""
    const backdrop = overlay()
    if (backdrop) {
      backdrop.style.transition = reduce ? "none" : "opacity 200ms ease-out"
      backdrop.style.opacity = ""
    }
  }

  sheet.addEventListener("touchstart", onStart, { passive: true })
  sheet.addEventListener("touchmove", onMove, { passive: false })
  sheet.addEventListener("touchend", onEnd)
  sheet.addEventListener("touchcancel", onEnd)
  return () => {
    sheet.removeEventListener("touchstart", onStart)
    sheet.removeEventListener("touchmove", onMove)
    sheet.removeEventListener("touchend", onEnd)
    sheet.removeEventListener("touchcancel", onEnd)
  }
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const detachDrag = React.useRef<(() => void) | null>(null)

  // La hoja se monta y desmonta con cada apertura (portal de Radix): el gesto
  // se engancha cuando aparece el nodo y se suelta cuando se va.
  const sheetRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      detachDrag.current?.()
      detachDrag.current = node ? attachSheetDrag(node, () => closeRef.current?.click()) : null
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  // Como hoja (celular), Radix enfocaba el primer campo al abrir y eso abría
  // el teclado o el selector de fecha antes de que la persona eligiera qué
  // completar. Ahí el foco va a la hoja misma: sigue dentro del diálogo para
  // lectores de pantalla, sin abrir nada. En escritorio queda el foco en el
  // primer campo, que sí ayuda a quien usa teclado.
  function handleOpenAutoFocus(event: Event) {
    onOpenAutoFocus?.(event)
    if (event.defaultPrevented || !window.matchMedia(SHEET_QUERY).matches) return
    event.preventDefault()
    ;(event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true })
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={sheetRef}
        data-slot="dialog-content"
        className={cn(
          // Mobile: hoja pegada abajo (design/admin-iphone n-hojas). El
          // Dialog de Radix es el mismo en las dos formas — solo cambia la
          // presentación — para conservar foco y accesibilidad sin
          // reimplementar el patrón.
          "fixed inset-x-0 bottom-0 z-50 grid max-h-[85vh] w-full gap-4 overflow-y-auto rounded-t-[14px] border-t border-[var(--hs-border-card)] bg-popover pt-2 pb-6 text-sm text-popover-foreground outline-none duration-150 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          // Desktop (sm+): diálogo centrado. `bottom-auto` anula el
          // `bottom-0` de la hoja: con `top: 50%` el diálogo quedaba estirado
          // a media pantalla y un formulario largo se salía por debajo. Con
          // alto máximo y desplazamiento propio entra en ventanas bajas.
          "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-y-auto sm:rounded-xl sm:border-t-0 sm:bg-popover sm:p-4 sm:ring-1 sm:ring-foreground/10 sm:data-open:zoom-in-95 sm:data-open:fade-in-0 sm:data-open:slide-in-from-bottom-0 sm:data-closed:zoom-out-95 sm:data-closed:fade-out-0 sm:data-closed:slide-out-to-bottom-0",
          className
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        {...props}
      >
        {/* Grabber: solo en la presentación de hoja (mobile). */}
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-9.5 shrink-0 rounded-full bg-[var(--hs-mist)] sm:hidden"
        />
        <div className="flex flex-col gap-4 px-4 sm:contents">{children}</div>
        {/* Lo "toca" el gesto de deslizar hacia abajo para cerrar la hoja. */}
        <DialogPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden="true" className="hidden" />

        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              // Como hoja (celular) el área táctil es de 44px; el ícono queda
              // en el mismo lugar que antes.
              className="absolute top-0 right-0 size-11 sm:top-2 sm:right-2 sm:size-7"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-6 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:-mb-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
