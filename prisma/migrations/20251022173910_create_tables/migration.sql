/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,parentId,name]` on the table `drive_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[storagePath]` on the table `file_metadata` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "public"."ShareLevel" AS ENUM ('VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "public"."drive_items" ALTER COLUMN "permission" SET DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "public"."users" (
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."share_permissions" (
    "shareId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "permissionLevel" "public"."ShareLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_permissions_pkey" PRIMARY KEY ("shareId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "share_permissions_itemId_sharedWithUserId_key" ON "public"."share_permissions"("itemId", "sharedWithUserId");

-- CreateIndex
CREATE UNIQUE INDEX "drive_items_ownerId_parentId_name_key" ON "public"."drive_items"("ownerId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "file_metadata_storagePath_key" ON "public"."file_metadata"("storagePath");

-- AddForeignKey
ALTER TABLE "public"."drive_items" ADD CONSTRAINT "drive_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."share_permissions" ADD CONSTRAINT "share_permissions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."drive_items"("itemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."share_permissions" ADD CONSTRAINT "share_permissions_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
