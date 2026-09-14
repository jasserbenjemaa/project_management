/*
  Warnings:

  - A unique constraint covering the columns `[projectId,functionName]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigneeLLRId" TEXT,
ADD COLUMN     "assigneeLLTId" TEXT,
ADD COLUMN     "codeVersion" TEXT,
ADD COLUMN     "complexity" INTEGER,
ADD COLUMN     "fileC" TEXT,
ADD COLUMN     "functionName" TEXT,
ADD COLUMN     "iqa" TEXT,
ADD COLUMN     "its" TEXT,
ADD COLUMN     "llrId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_functionName_key" ON "Task"("projectId", "functionName");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeLLTId_fkey" FOREIGN KEY ("assigneeLLTId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeLLRId_fkey" FOREIGN KEY ("assigneeLLRId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
