import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth";

// Anything not listed here is treated as protected.
const PUBLIC_PATHS = ["/sign-in"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!session && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    // send the user back to where they were headed after they log in
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (session && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Run on every route except static assets / Next internals - this is what
// actually makes protection apply app-wide, instead of just "/" and "/sign-in".
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
