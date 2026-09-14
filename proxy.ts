import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "./lib/auth";
import { ensureDefaultUnitManager, userExists } from "./lib/bootstrap";

// Anything not listed here is treated as protected.
const PUBLIC_PATHS = ["/sign-in"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // A signed session cookie can still be "valid" while pointing at a User
  // that no longer exists - e.g. the DB was wiped (migrate reset) while
  // someone was logged in, or their account was deleted. Every protected
  // page assumes session.userId resolves to a real user, so without this
  // check they'd all just throw instead of bouncing to sign-in.
  const sessionUserExists = session?.userId
    ? await userExists(session.userId as string)
    : false;
  const hasValidSession = !!session && sessionUserExists;

  if (session && !sessionUserExists) {
    await deleteSession();
  }

  if (!hasValidSession) {
    // No usable session - either there never was one, or we just cleared
    // a stale one above. Either way, make sure at least one account
    // exists to sign back in with. This is what actually recovers from a
    // fully-wiped DB: without it, sign-in would have nothing to
    // authenticate against and nobody could get back in at all.
    await ensureDefaultUnitManager();
  }

  if (!hasValidSession && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    // send the user back to where they were headed after they log in
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (hasValidSession && isPublicPath) {
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
