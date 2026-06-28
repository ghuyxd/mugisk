import { generateExplorePlaylists } from "./ai-explore";

let interval: NodeJS.Timeout | null = null;

export function startExploreCron() {
  if (interval) return;

  console.log("[cron] Starting explore playlist background job...");
  
  // Run immediately on start
  generateExplorePlaylists().catch(console.error);

  // Run every 2 hours (2 * 60 * 60 * 1000 = 7200000 ms)
  interval = setInterval(() => {
    console.log("[cron] Renewing explore playlists...");
    generateExplorePlaylists().catch(console.error);
  }, 7200000);
}
