-- DropForeignKey
ALTER TABLE "file_metadata" DROP CONSTRAINT "file_metadata_itemId_fkey";

-- AddForeignKey
ALTER TABLE "file_metadata" ADD CONSTRAINT "file_metadata_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "drive_items"("itemId") ON DELETE CASCADE ON UPDATE CASCADE;
