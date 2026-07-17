import { PrismaClient } from "../app/generated/prisma/client";
// or adjust the relative path depending on the file's location
import { PrismaPg } from "@prisma/adapter-pg";

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});
