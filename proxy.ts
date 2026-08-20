import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Refresca la sesion de Supabase en cada request y protege `/admin`.
 *
 * En Next 16 esta capa se llama `proxy` (antes `middleware`).
 *
 * Solo comprueba que haya sesion; que ademas sea administrador lo verifica el
 * layout de `/admin` contra la base. Consultar `admins` aca significaria un
 * viaje extra a la base en cada navegacion, y RLS ya impide que un usuario
 * no-admin vea nada aunque llegue a renderizar la pagina.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Importante: `getUser()` va contra el servidor de Supabase. No reemplazar por
  // `getSession()`, que solo lee la cookie y por lo tanto es falsificable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/admin")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
