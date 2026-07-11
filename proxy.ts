import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth";

export default async function proxy(request: NextRequest) {
  const session = await getSession();
  const isAuthPage = request.nextUrl.pathname != "/sign-in";
  if (!session && isAuthPage) return NextResponse.redirect("/sign-in");
  if (session && isAuthPage) return NextResponse.redirect("/dashboard");
  return NextResponse.next();
}
export const config = {
  matcher: ["/dashboard/:path*", "sign-in"],
};
