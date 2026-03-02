-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "razorpayKeyId" TEXT,
ADD COLUMN     "razorpayKeySecret" TEXT,
ADD COLUMN     "razorpayLinkedAccountId" TEXT;

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "responseBody" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE INDEX "CartReservation_expiresAt_idx" ON "CartReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "CartReservation_sessionId_idx" ON "CartReservation"("sessionId");

-- CreateIndex
CREATE INDEX "CartReservation_variantId_idx" ON "CartReservation"("variantId");

-- AddForeignKey
ALTER TABLE "CartReservation" ADD CONSTRAINT "CartReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
