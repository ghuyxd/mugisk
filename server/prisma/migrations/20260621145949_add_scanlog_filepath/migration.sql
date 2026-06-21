-- AlterTable
ALTER TABLE "scan_logs" ADD COLUMN     "filePath" TEXT;

-- CreateIndex
CREATE INDEX "scan_logs_filePath_idx" ON "scan_logs"("filePath");
