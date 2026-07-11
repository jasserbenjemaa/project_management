import { db } from "./db";
import { getSession } from "./auth";
import { email } from "zod";

export const getCurrentUser = async () => {
  const session = await getSession();
  if (!session) return null;
  try {
    const userId = session?.userId;
    return db.user.findUnique({ where: { id: userId } });
  } catch (e) {
    console.error("error in getting current user by id: ", e);
  }
};
export const getUserByEmail = async (email: string) => {
  try {
    return db.user.findUnique({ where: { email } });
  } catch (e) {
    console.error("error in getting user by email: ", e);
  }
};
