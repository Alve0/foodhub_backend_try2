ALTER TABLE "users"
ADD COLUMN "resetTokenHash" VARCHAR(64),
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_resetTokenHash_key" ON "users"("resetTokenHash");