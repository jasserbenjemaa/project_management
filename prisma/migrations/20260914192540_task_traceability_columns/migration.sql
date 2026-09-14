/*
  Warnings:

  - The values [TODO,DONE] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[projectId,sheetRowId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('IN_PROGRESS', 'READY_FOR_DRY_RUN', 'DRY_RUN_IN_PROGRESS', 'READY_FOR_TC', 'TC_DONE', 'TC_CORRECTION', 'READY_FOR_QC', 'READY_FOR_DELIVERY', 'DELIVERED', 'OUT_OF_SCOPE', 'BLOCKED');
ALTER TABLE "public"."Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- DropIndex
DROP INDEX "Task_projectId_functionName_key";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "sheetRowId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_sheetRowId_key" ON "Task"("projectId", "sheetRowId");
