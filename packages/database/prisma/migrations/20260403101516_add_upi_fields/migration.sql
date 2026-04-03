-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "upiVerificationStatus" TEXT,
ADD COLUMN     "utrNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "upiId" TEXT;
