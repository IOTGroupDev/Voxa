ALTER TYPE "ButtonGesture" ADD VALUE IF NOT EXISTS 'triple_press';
ALTER TYPE "ButtonGesture" ADD VALUE IF NOT EXISTS 'hold_and_speak';

CREATE TYPE "DeviceType" AS ENUM ('dongle');

ALTER TABLE "Device"
  ADD COLUMN "type" "DeviceType" NOT NULL DEFAULT 'dongle',
  ADD COLUMN "batteryLevel" INTEGER;

ALTER TABLE "Device" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "DeviceStatus" RENAME TO "DeviceStatus_old";
CREATE TYPE "DeviceStatus" AS ENUM ('paired', 'disconnected', 'syncing', 'error');

ALTER TABLE "Device"
  ALTER COLUMN "status" TYPE "DeviceStatus"
  USING (
    CASE "status"::text
      WHEN 'active' THEN 'paired'
      WHEN 'inactive' THEN 'disconnected'
      WHEN 'lost' THEN 'disconnected'
      WHEN 'revoked' THEN 'disconnected'
      ELSE 'disconnected'
    END
  )::"DeviceStatus";

ALTER TABLE "Device" ALTER COLUMN "status" SET DEFAULT 'paired';
DROP TYPE "DeviceStatus_old";
