"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
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

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Mobile: hoja pegada abajo (design/admin-iphone n-hojas). El
          // Dialog de Radix es el mismo en las dos formas — solo cambia la
          // presentación — para conservar foco y accesibilidad sin
          // reimplementar el patrón.
          "fixed inset-x-0 bottom-0 z-50 grid max-h-[85vh] w-full gap-4 overflow-y-auto rounded-t-[14px] border-t border-border bg-popover pt-2 pb-6 text-sm text-popover-foreground outline-none duration-150 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          // Desktop (sm+): diálogo centrado de siempre, sin cambios.
          "sm:top-1/2 sm:left-1/2 sm:max-h-none sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-visible sm:rounded-xl sm:border-t-0 sm:bg-popover sm:p-4 sm:ring-1 sm:ring-foreground/10 sm:data-open:zoom-in-95 sm:data-open:fade-in-0 sm:data-open:slide-in-from-bottom-0 sm:data-closed:zoom-out-95 sm:data-closed:fade-out-0 sm:data-closed:slide-out-to-bottom-0",
          className
        )}
        {...props}
      >
        {/* Grabber: solo en la presentación de hoja (mobile). */}
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-9.5 shrink-0 rounded-full bg-[var(--hs-mist)] sm:hidden"
        />
        <div className="flex flex-col gap-4 px-4 sm:contents">{children}</div>
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
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
