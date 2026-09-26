"use client"

import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const pathname = usePathname()

  // El panel admin tiene una tab bar inferior en mobile (design/admin-iphone
  // n-estados): los avisos van arriba de esa barra, no arriba de la
  // pantalla como en el portal público, que no tiene ese chrome.
  const isAdmin = pathname?.startsWith("/admin") ?? false
  // Alto de la tab bar (6 + 56 + 6, ver admin-tab-bar.tsx) más 12 de aire.
  // Sin `env()`, mismo criterio que el FAB de venta suelta. Va también en
  // `mobileOffset`: por
  // debajo de 600px Sonner ignora `offset` y usa ese otro valor (16px por
  // defecto), que dejaba el aviso encima de la tab bar.
  const adminBottom = "80px"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={isAdmin ? "bottom-center" : "top-center"}
      offset={isAdmin ? { bottom: adminBottom } : undefined}
      mobileOffset={isAdmin ? { bottom: adminBottom } : undefined}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
