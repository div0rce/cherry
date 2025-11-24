-- CreateEnum
CREATE TYPE "MerchantVertical" AS ENUM ('LODGING', 'TRANSPORT', 'RETAIL', 'FOOD_DRINK', 'DIGITAL_SERVICES', 'HEALTHCARE', 'PROFESSIONAL', 'FINANCIAL', 'GOVERNMENT', 'NONPROFIT', 'ENTERTAINMENT', 'EDUCATION', 'MISC');

-- CreateEnum
CREATE TYPE "MerchantChannel" AS ENUM ('ONLINE', 'OFFLINE', 'MIXED');

-- CreateEnum
CREATE TYPE "SpendDomain" AS ENUM ('NECESSITY', 'DISCRETIONARY', 'INVESTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MerchantRiskProfile" AS ENUM ('NORMAL', 'QUASI_CASH', 'GAMBLING', 'HIGH_CHARGEBACK', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "MerchantLifeCategory" AS ENUM ('TRAVEL', 'HOME', 'AUTO', 'HEALTH', 'BUSINESS', 'PERSONAL_SERVICES', 'EDUCATION', 'CHARITY', 'GOVERNMENT', 'OTHER');

-- AlterTable
ALTER TABLE "MerchantCategory" ADD COLUMN     "channel" "MerchantChannel",
ADD COLUMN     "lifeCategory" "MerchantLifeCategory",
ADD COLUMN     "riskProfile" "MerchantRiskProfile",
ADD COLUMN     "spendDomain" "SpendDomain",
ADD COLUMN     "vertical" "MerchantVertical";
