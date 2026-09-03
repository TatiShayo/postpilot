import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Validates the `next` redirect parameter to strictly prevent Open Redirect attacks.
 * Only relative internal paths beginning with `/` (and not `//` or `/\` or protocols) are allowed.
 */
export function getSafeRedirectPath(nextParam: string | null): string {
  if (!nextParam) return "/dashboard";
  const trimmed = nextParam.trim();

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://") ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return "/dashboard";
  }

  return trimmed;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const safeNext = getSafeRedirectPath(rawNext);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
