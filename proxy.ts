import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth";

export default async function proxy(request: NextRequest) {
  const session = await getSession();
  const isAuthPage = request.nextUrl.pathname.startsWith("/sign-in");
  if (!session && !isAuthPage)
    return NextResponse.redirect(new URL("/sign-in", request.url));
  if (session && isAuthPage)
    return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/", "/sign-in"],
};
