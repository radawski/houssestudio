import { ArrowUpRight, ChevronRight, Clock, MapPin } from "lucide-react";

import { anton } from "@/components/public/site-hero";
import {
  formatDays,
  formatRanges,
  mapsUrl,
  type HoursGroup,
} from "@/lib/business-info";
import { BUSINESS_ADDRESS, BUSINESS_INSTAGRAM, BUSINESS_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const DEVELOPER_MAIL =
  "mailto:agustinradawski18@gmail.com?subject=Consulta%20por%20desarrollo%20web";

/** lucide ya no trae logos de marcas: el de Instagram va dibujado acá. */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

const LABEL = "text-muted-foreground text-xs tracking-[0.2em] uppercase";

/**
 * Pie de la portada: dónde queda, cuándo atiende e Instagram. Es lo primero
 * que se pregunta antes de reservar, y para Google es la señal de que esto es
 * un local en Santo Tomé y no un sitio cualquiera.
 *
 * Dos diseños, elegidos en el lienzo "Pie de la portada": en el celular, una
 * lista con filas enteras para tocar (dirección → Maps, Instagram); desde
 * `lg`, cuatro columnas con la marca. Se dibujan los dos y se oculta uno por
 * CSS: son estructuras distintas, no la misma reacomodada.
 *
 * Los horarios llegan ya agrupados desde `business_hours`, así que cambiarlos
 * en el panel alcanza (la acción revalida `/`).
 */
export function BusinessInfo({
  groups,
  hasWhatsapp,
}: {
  groups: HoursGroup[];
  /** Con el botón flotante de WhatsApp hace falta lugar abajo, como en el stepper. */
  hasWhatsapp: boolean;
}) {
  const instagramHandle = new URL(BUSINESS_INSTAGRAM).pathname.replaceAll("/", "");
  const maps = mapsUrl();
  const locality = `${BUSINESS_ADDRESS.locality}, ${BUSINESS_ADDRESS.region}`;

  return (
    <footer
      className={cn("border-t px-6 pt-10 pb-12 sm:px-10 lg:pt-16 lg:pb-10", hasWhatsapp && "pb-28")}
    >
      {/* Celular y tablet: lista con íconos. */}
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 lg:hidden">
        <h2 className={LABEL}>El local</h2>
        <div className="bg-card flex flex-col border border-[var(--hs-border-card)]">
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 items-center gap-3.5 border-b border-[var(--hs-divider)] px-4 py-3"
          >
            <MapPin className="text-muted-foreground size-5 shrink-0" aria-hidden />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px]">{BUSINESS_ADDRESS.street}</span>
              <span className="text-muted-foreground text-[13px]">{locality} · Cómo llegar</span>
            </span>
            <ChevronRight className="text-muted-foreground size-[18px] shrink-0" aria-hidden />
          </a>
          <div className="flex min-h-16 items-center gap-3.5 border-b border-[var(--hs-divider)] px-4 py-3">
            <Clock className="text-muted-foreground size-5 shrink-0" aria-hidden />
            <HoursText groups={groups} className="flex flex-1 flex-col gap-0.5" />
          </div>
          <a
            href={BUSINESS_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 items-center gap-3.5 px-4 py-3"
          >
            <InstagramIcon className="text-muted-foreground size-5 shrink-0" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px]">@{instagramHandle}</span>
              <span className="text-muted-foreground text-[13px]">Cortes recientes en Instagram</span>
            </span>
            <ChevronRight className="text-muted-foreground size-[18px] shrink-0" aria-hidden />
          </a>
        </div>
      </div>

      {/* Escritorio: marca y tres columnas. */}
      <div className="mx-auto hidden w-full max-w-5xl grid-cols-4 gap-10 lg:grid">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs tracking-[0.28em] uppercase">
            Barbería en {BUSINESS_ADDRESS.locality}
          </p>
          <p className={`${anton.className} text-[34px] leading-[1.05] uppercase`}>{BUSINESS_NAME}</p>
        </div>
        <div className="flex flex-col gap-2 border-l border-[var(--hs-border-card)] pl-6 text-[15px] leading-normal">
          <h2 className={LABEL}>Dónde estamos</h2>
          <address className="not-italic">
            {BUSINESS_ADDRESS.street}
            <br />
            {locality}
          </address>
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="border-muted-foreground mt-2 inline-flex h-11 items-center gap-2.5 self-start border px-[18px] text-xs tracking-[0.18em] uppercase"
          >
            Cómo llegar
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
        <div className="flex flex-col gap-2 border-l border-[var(--hs-border-card)] pl-6 text-[15px] leading-normal">
          <h2 className={LABEL}>Horarios</h2>
          <HoursText groups={groups} className="flex flex-col gap-0.5" stacked />
        </div>
        <div className="flex flex-col gap-2 border-l border-[var(--hs-border-card)] pl-6 text-[15px] leading-normal">
          <h2 className={LABEL}>Instagram</h2>
          <a
            href={BUSINESS_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start underline underline-offset-4"
          >
            @{instagramHandle}
          </a>
        </div>
      </div>

      <p className="text-muted-foreground mx-auto mt-6 w-full max-w-xl text-xs leading-normal lg:mt-10 lg:max-w-5xl lg:border-t lg:border-[var(--hs-border-card)] lg:pt-6 lg:text-center">
        © {new Date().getFullYear()} {BUSINESS_NAME}. Desarrollado por{" "}
        <a href={DEVELOPER_MAIL} className="underline underline-offset-[3px]">
          Agustín Radawski
        </a>
      </p>
    </footer>
  );
}

/**
 * Días arriba y horas abajo, en gris. `stacked` pone cada bloque horario en
 * su propia línea (escritorio); si no, van en una con "·" (celular).
 */
function HoursText({
  groups,
  className,
  stacked = false,
}: {
  groups: HoursGroup[];
  className?: string;
  stacked?: boolean;
}) {
  if (groups.length === 0) {
    return <span className={className}>Consultá los días disponibles al reservar.</span>;
  }

  return (
    <span className={className}>
      {groups.map((group) => (
        <span key={group.weekdays.join("-")} className="flex flex-col gap-0.5">
          <span className="text-[15px]">{formatDays(group.weekdays)}</span>
          {stacked ? (
            group.ranges.map((range) => (
              <span key={range.opens} className="text-muted-foreground">
                {formatRanges([range])}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground text-[13px]">
              {group.ranges.map((range) => formatRanges([range])).join(" · ")}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
