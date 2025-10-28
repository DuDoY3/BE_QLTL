-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'WORD', 'EXCEL', 'POWERPOINT', 'OTHER');

-- AlterTable
ALTER TABLE "file_metadata" ADD COLUMN "documentType" "DocumentType";

