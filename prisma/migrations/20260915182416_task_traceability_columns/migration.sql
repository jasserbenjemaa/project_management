/*
  Warnings:

  - A unique constraint covering the columns `[projectId,kind]` on the table `Sheet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Sheet_projectId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Sheet_projectId_kind_key" ON "Sheet"("projectId", "kind");
