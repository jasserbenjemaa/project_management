/*
  Warnings:

  - A unique constraint covering the columns `[projectId]` on the table `Sheet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sheet_projectId_key" ON "Sheet"("projectId");

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
