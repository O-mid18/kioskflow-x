import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Supabase sessions are stored in localStorage (browser-only),
// not cookies — middleware cannot read them.
// Auth is handled inside each protected page via supabase.auth.getUser().

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
