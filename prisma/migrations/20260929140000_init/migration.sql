-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('INVALID_FORMAT', 'FILE_TOO_SMALL', 'RESOLUTION_TOO_LOW', 'TOO_SIMILAR', 'BLURRY', 'NO_FACE', 'FACE_TOO_SMALL', 'MULTIPLE_FACES');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'PENDING',
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "perceptualHash" TEXT,
    "batchId" TEXT,
    "blurScore" DOUBLE PRECISION,
    "faceCount" INTEGER,
    "largestFaceRatio" DOUBLE PRECISION,
    "rejectionReasons" "RejectionReason"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "Image_userId_status_idx" ON "Image"("userId", "status");

-- CreateIndex
CREATE INDEX "Image_userId_perceptualHash_idx" ON "Image"("userId", "perceptualHash");

-- CreateIndex
CREATE INDEX "Image_userId_batchId_idx" ON "Image"("userId", "batchId");

-- CreateIndex
CREATE INDEX "Image_userId_committedAt_idx" ON "Image"("userId", "committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingJob_imageId_key" ON "ProcessingJob"("imageId");

-- CreateIndex
CREATE INDEX "ProcessingJob_status_runAfter_idx" ON "ProcessingJob"("status", "runAfter");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
