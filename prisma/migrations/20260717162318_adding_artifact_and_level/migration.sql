-- CreateEnum
CREATE TYPE "Artifact" AS ENUM ('HLT', 'LLT', 'LLR', 'CODE_REVIEW', 'ARCHITECTURE');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'EXPERT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "artifact_type" "Artifact",
ADD COLUMN     "seniority_level" "Level";
