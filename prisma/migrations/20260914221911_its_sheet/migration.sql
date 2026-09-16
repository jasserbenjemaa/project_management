-- CreateEnum
CREATE TYPE "SheetKind" AS ENUM ('PROGRESS', 'ITS');

-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "kind" "SheetKind" NOT NULL DEFAULT 'PROGRESS';
