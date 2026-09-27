import { cn } from "@/lib/utils"

/**
 * Barra de esqueleto (design/admin-iphone n-estados): color y pulso propios
 * del panel en vez del `animate-pulse` de shadcn. La forma (ancho, alto,
 * radio) la pone quien la usa, copiando la del contenido real para que la
 * pantalla no salte al cargar.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("hs-skeleton rounded bg-[var(--hs-skeleton)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
