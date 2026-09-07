/*
  Warnings:

  - You are about to drop the column `projectId` on the `Sheet` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Sheet" DROP CONSTRAINT "Sheet_projectId_fkey";

-- DropIndex
DROP INDEX "Sheet_projectId_key";

-- AlterTable
ALTER TABLE "Sheet" DROP COLUMN "projectId";
