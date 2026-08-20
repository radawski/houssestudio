import { redirect } from "next/navigation";

/**
 * El stepper pasó a vivir en la portada, junto al hero que lo ancla.
 *
 * Esta ruta se mantiene como atajo porque ya circula en links compartidos:
 * redirige al ancla en vez de devolver un 404.
 */
export default function BookingRedirectPage() {
  redirect("/#reservar");
}
