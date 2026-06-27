-- CreateTable
CREATE TABLE "lyrics" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "plainLyrics" TEXT,
    "syncedLyrics" TEXT,
    "instrumental" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lyrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lyrics_trackId_key" ON "lyrics"("trackId");

-- AddForeignKey
ALTER TABLE "lyrics" ADD CONSTRAINT "lyrics_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
