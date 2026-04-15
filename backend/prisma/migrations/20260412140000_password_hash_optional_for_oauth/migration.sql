-- AlterTable: allow Google (OAuth) users without a password
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
