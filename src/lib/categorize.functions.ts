import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIES } from "@/lib/expenses";

export const suggestCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ merchant: z.string().max(120), notes: z.string().max(500), amount: z.string().max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({
        schema: z.object({
          category: z.enum(CATEGORIES as [string, ...string[]]),
          confidence: z.number().describe("0-100, how sure you are"),
        }),
      }),
      system:
        "Classify an Indian consumer expense into exactly one category. Know Indian merchants and apps (Swiggy, Zomato, Blinkit, Rapido, BookMyShow, etc). Use 'Other' only when truly unclear, with low confidence.",
      prompt: `Merchant: ${data.merchant || "-"}\nNotes: ${data.notes || "-"}\nAmount: ₹${data.amount || "-"}`,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    const out = await result.output;
    return {
      category: out.category,
      confidence: Math.max(1, Math.min(99, Math.round(out.confidence))),
    };
  });
