import { AI_MODEL, aiConfigured } from "@/lib/server/ai";
import { youtubeConfigured } from "@/lib/server/youtube";
import { json } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

/** Reports which integrations are configured. Never returns secrets. */
export function GET() {
  return json({
    ai: aiConfigured(),
    model: aiConfigured() ? AI_MODEL : null,
    youtube: youtubeConfigured(),
    webSearch: aiConfigured(),
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}
