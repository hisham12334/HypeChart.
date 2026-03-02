/*
  Warnings:

  - You are about to alter the column `grossAmount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `platformFee` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `netAmount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "paidOutAt" TIMESTAMP(3),
ADD COLUMN     "payoutId" TEXT,
ADD COLUMN     "razorpayFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "razorpaySettlementId" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "settlementEta" TIMESTAMP(3),
ALTER COLUMN "grossAmount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "platformFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "netAmount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappPhoneNumberId" TEXT,
ADD COLUMN     "whatsappToken" TEXT;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "price" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "razorpayPayoutId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_userId_status_idx" ON "Transaction"("userId", "status");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
