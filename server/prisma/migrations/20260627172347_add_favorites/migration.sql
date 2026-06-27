-- CreateTable
CREATE TABLE "favorite_tracks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_tracks_userId_idx" ON "favorite_tracks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_tracks_userId_trackId_key" ON "favorite_tracks"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "favorite_tracks" ADD CONSTRAINT "favorite_tracks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_tracks" ADD CONSTRAINT "favorite_tracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
