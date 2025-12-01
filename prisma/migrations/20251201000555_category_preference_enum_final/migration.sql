/*
  Warnings:

  - You are about to drop the column `categoryEnum` on the `CategoryPreference` table. All the data in the column will be lost.
  - Changed the type of `category` on the `CategoryPreference` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- Add new enum column for migration
ALTER TABLE "CategoryPreference" ADD COLUMN "category_new" "RewardCategory";

-- Populate new column from enum shadow when present, otherwise fallback to OTHER
UPDATE "CategoryPreference"
SET "category_new" = COALESCE("categoryEnum", (
  CASE
    WHEN UPPER(REPLACE(REPLACE("category", ' ', '_'), '-', '_')) IN (
      'DINING','GROCERIES','GAS','TRAVEL','AIR_TRAVEL','HOTEL','CAR_RENTAL','ONLINE_SHOPPING','ENTERTAINMENT','HEALTH','UTILITIES','GENERAL_MERCHANDISE','OTHER'
    ) THEN CAST(UPPER(REPLACE(REPLACE("category", ' ', '_'), '-', '_')) AS "RewardCategory")
    ELSE 'OTHER'::"RewardCategory"
  END
));

-- Drop legacy columns and rename
ALTER TABLE "CategoryPreference" DROP COLUMN "categoryEnum";
ALTER TABLE "CategoryPreference" DROP COLUMN "category";
ALTER TABLE "CategoryPreference" RENAME COLUMN "category_new" TO "category";
ALTER TABLE "CategoryPreference" ALTER COLUMN "category" SET NOT NULL;

-- Recreate unique index
DROP INDEX IF EXISTS "CategoryPreference_userId_category_key";
CREATE UNIQUE INDEX "CategoryPreference_userId_category_key" ON "CategoryPreference"("userId", "category");
