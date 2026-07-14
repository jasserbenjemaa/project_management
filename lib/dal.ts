import { db } from "./db";
import { getSession } from "./auth";

export const getCurrentUser = async () => {
  const session = await getSession();
  if (!session) return null;

  try {
    const userId = session.userId;
    if (typeof userId !== "string") {
      console.error("session.userId is not a string:", userId);
      return null;
    }

    return await db.user.findUnique({
      where: { id: userId },
    });
  } catch (e) {
    console.error("error in getting current user by id: ", e);
    return null;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    return await db.user.findUnique({
      where: { email },
    });
  } catch (e) {
    console.error("error in getting user by email: ", e);
    return null;
  }
};
