/*
  Warnings:

  - You are about to drop the `SheetStatusChange` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SheetStatusChange" DROP CONSTRAINT "SheetStatusChange_changedById_fkey";

-- DropForeignKey
ALTER TABLE "SheetStatusChange" DROP CONSTRAINT "SheetStatusChange_sheetId_fkey";

-- DropTable
DROP TABLE "SheetStatusChange";
