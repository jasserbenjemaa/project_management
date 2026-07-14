import { hash, compare } from "bcrypt";
import { Role } from "./types";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_EXPIRATION = "7d";
const TOKEN_AGE = 60 * 60 * 24 * 5;
const TOKEN_NAME = "auth_token";
export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return compare(password, hashedPassword);
}
export async function createUser(
  name: string,
  email: string,
  password: string,
  role: Role,
  managerId: string,
) {
  const hashedPassword = await hashPassword(password);
  try {
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        managerId,
      },
    });
    return { id: user.id, email: user.email };
  } catch (e) {
    console.log("error in creating a user: ", e);
    return null;
  }
}
async function verifyJWT(token: string): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as jose.JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
async function generateJWT(payload: jose.JWTPayload) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}
export async function createSession(userId: string) {
  try {
    const token = await generateJWT({ userId });
    const cookieStore = await cookies();
    cookieStore.set({
      name: TOKEN_NAME,
      value: token,
      httpOnly: true,
      maxAge: TOKEN_AGE,
      path: "/",
      sameSite: "lax",
    });
    return true;
  } catch (e) {
    console.log("Error in creating session", e);
    return false;
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;
    const payload = await verifyJWT(token);
    return payload ? { userId: payload.userId } : null;
  } catch (e) {
    console.error("error getting session", e);
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}
