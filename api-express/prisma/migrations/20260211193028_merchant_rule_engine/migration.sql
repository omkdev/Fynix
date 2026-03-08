-- CreateTable
CREATE TABLE "merchant_category_map" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "merchant_keyword" TEXT NOT NULL,
    "normalized_keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_matched_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_category_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_corrections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expense_id" TEXT,
    "merchant" TEXT,
    "description" TEXT,
    "old_category" TEXT NOT NULL,
    "new_category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_category_map_normalized_keyword_idx" ON "merchant_category_map"("normalized_keyword");

-- CreateIndex
CREATE INDEX "merchant_category_map_user_id_normalized_keyword_idx" ON "merchant_category_map"("user_id", "normalized_keyword");

-- CreateIndex
CREATE INDEX "merchant_category_map_category_confidence_score_idx" ON "merchant_category_map"("category", "confidence_score");

-- CreateIndex
CREATE INDEX "category_corrections_user_id_created_at_idx" ON "category_corrections"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "category_corrections_user_id_merchant_idx" ON "category_corrections"("user_id", "merchant");

-- AddForeignKey
ALTER TABLE "merchant_category_map" ADD CONSTRAINT "merchant_category_map_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_corrections" ADD CONSTRAINT "category_corrections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
