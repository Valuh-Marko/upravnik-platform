-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN');

-- AlterTable: add systemRole to users
ALTER TABLE "users" ADD COLUMN "systemRole" "SystemRole";

-- Convert any existing SUPER_ADMIN building_members to UPRAVNIK before removing the value
UPDATE "building_members" SET "role" = 'UPRAVNIK' WHERE "role" = 'SUPER_ADMIN';

-- AlterEnum: remove SUPER_ADMIN from Role
-- PostgreSQL requires creating a new type, migrating, then dropping the old one
CREATE TYPE "Role_new" AS ENUM ('UPRAVNIK', 'BOARD_MEMBER', 'RESIDENT');
ALTER TABLE "building_members" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new";
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
