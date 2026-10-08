import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const isReset = request.nextUrl.searchParams.get("next") === "reset-password";
  const destination = isReset ? "/reset-password" : "/dashboard";
  // Fixed destinations only, so the link cannot redirect anywhere else.
  const failure = isReset ? "/forgot-password?error=expired" : "/login?error=link";
  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Google sends the user back with ?error= when they cancel or sign-in fails. Expired email links
  // carry error_code=otp_expired and keep the link message above.
  const providerError = request.nextUrl.searchParams.get("error");
  const errorCode = request.nextUrl.searchParams.get("error_code");
  if (providerError && !isReset && errorCode !== "otp_expired") {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  if (!code) return NextResponse.redirect(new URL(failure, request.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logError("auth.exchangeCode", error);
    return NextResponse.redirect(new URL(failure, request.url));
  }

  return response;
}
