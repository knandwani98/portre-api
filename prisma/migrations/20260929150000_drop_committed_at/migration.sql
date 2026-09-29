-- DropIndex
DROP INDEX "Image_userId_committedAt_idx";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "committedAt";
