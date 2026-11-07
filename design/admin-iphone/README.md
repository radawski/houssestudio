# Wireframes del panel admin — iPhone 390 × 844

Export del canvas de diseño. **No es código a copiar**: es la especificación visual y
estructural del panel `/admin` en móvil. La app real es Next.js + shadcn (ver `app/admin/`).

## Cómo leer esto

1. `canvas.json` — índice del canvas.
   - `boards`: un artboard por pantalla (`x`, `y`, `w`, `h`, `title`). Cada clave es un archivo `.dc.html` de esta carpeta.
   - `notes`: las especificaciones. Hay tres tipos:
     - `t1`…`t5` (`kind: "title1"`): títulos de fila del canvas.
     - `n-sistema`, `n-hojas`, `n-estados`: reglas transversales. **Leer estas tres primero.**
     - `n-<Pantalla>`: la spec de ese artboard — ruta y archivo del repo, orden de bloques,
       medidas, tokens, qué es `<a>` y qué es `<button>`, qué se renderiza condicionalmente.
2. Los `.dc.html` son el render del wireframe: HTML autocontenido con estilos en línea.
   Los valores (px, hex, pesos) son la fuente de verdad; la estructura de `div` no
   pretende ser la estructura de componentes de React.

## Equivalencias

| Artboard | Ruta / componente |
|---|---|
| `Main.dc.html` | `/admin` — `app/admin/page.tsx` |
| `Agenda.dc.html`, `AgendaSemana`, `AgendaMes` | `/admin/agenda?vista=dia\|semana\|mes` |
| `Solicitudes.dc.html` | `/admin/solicitudes` |
| `Caja.dc.html`, `CajaSemana`, `CajaMes` | `/admin/caja?vista=dia\|semana\|mes` |
| `Servicios.dc.html` | `/admin/servicios` |
| `Disponibilidad.dc.html` | `/admin/disponibilidad` |
| `Mas.dc.html` | pantalla nueva (no existe en el repo) |
| `Sheet*.dc.html` | los `Dialog` de `components/admin/` y `app/admin/*`, restyleados a bottom sheet |
| `Vacio*.dc.html` | estados vacíos de cada ruta |
| `CargaHoy`, `ErrorCarga`, `AccionEnCurso`, `ToastExito`, `ToastError` | estados transversales |

Los colores salen de `app/tokens.css`. No agregar tokens nuevos.
