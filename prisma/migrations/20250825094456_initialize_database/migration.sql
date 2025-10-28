-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('FILE', 'FOLDER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('PRIVATE', 'SHARED');

-- CreateTable
CREATE TABLE "drive_items" (
    "itemId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_items_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "file_metadata" (
    "itemId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_metadata_pkey" PRIMARY KEY ("itemId")
);

-- AddForeignKey
ALTER TABLE "drive_items" ADD CONSTRAINT "drive_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "drive_items"("itemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_metadata" ADD CONSTRAINT "file_metadata_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "drive_items"("itemId") ON DELETE RESTRICT ON UPDATE CASCADE;
