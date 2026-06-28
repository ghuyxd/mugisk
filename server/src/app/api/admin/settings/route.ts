import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAdmin } from "@/lib/middleware";

export const PATCH = withAdmin(async (req) => {
  try {
    const body = await req.json();
    if (typeof body.aiFeatureEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const newValue = body.aiFeatureEnabled ? "true" : "false";
    const regex = /^AI_FEATURE_ENABLED=.*$/m;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `AI_FEATURE_ENABLED="${newValue}"`);
    } else {
      envContent += `\nAI_FEATURE_ENABLED="${newValue}"\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");

    // Update in memory immediately
    process.env.AI_FEATURE_ENABLED = newValue;

    return NextResponse.json({ success: true, aiFeatureEnabled: body.aiFeatureEnabled });
  } catch (error) {
    console.error("[admin/settings] Error updating .env", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
});
