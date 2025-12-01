-- CreateTable
CREATE TABLE "VineDevice" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "label" TEXT,
    "storeId" TEXT,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VineDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VineDevice_deviceId_key" ON "VineDevice"("deviceId");
