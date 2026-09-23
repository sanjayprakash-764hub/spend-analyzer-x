import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { userClientFromRequest } from "@/lib/user-supabase.server";
import { budgetStatus, comparePeriods, listExpenses, spendingSummary } from "@/lib/spending-tools.server";

const CATEGORY_LIST = "Food, Transport, Shopping, Entertainment, Education, Bills, Healthcare, Subscriptions, Travel, Personal, Other";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await userClientFromRequest(request);
        if (!user) return new Response("Please sign in again.", { status: 401 });

        const body = (await request.json()) as { messages?: unknown; today?: unknown };
        if (!Array.isArray(body.messages)) return new Response("Messages are required", { status: 400 });
        const messages = (body.messages as UIMessage[]).slice(-40);
        const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
          ? body.today
          : new Date().toISOString().slice(0, 10);

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("The assistant is not configured yet.", { status: 500 });

        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });
        const db = user.supabase;
        const date = z.string().describe("YYYY-MM-DD");

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system: `You are the Spend Manager assistant. You help one user understand their own recorded expenses (amounts in Indian rupees, ₹).
Today is ${today}. Categories: ${CATEGORY_LIST}.

STRICT RULES:
- Every number you state (totals, counts, differences, percentages, remaining budget) must come directly from a tool result. Never add, subtract, average, estimate or invent figures yourself. If a figure you need isn't in a tool result, call a tool that returns it.
- Always call a tool before answering any question about spending.
- For "compare with <month>" use compare_periods. For "where am I spending too much" use budget_status for the current month and spending_summary, then point out categories over or near their limits and the largest categories.
- If the user has no data for a period, say so plainly.
- Format money like ₹1,250. Keep answers short and friendly, using markdown lists when helpful.
- You cannot move money, and you give observations, not financial guarantees.`,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(50),
          tools: {
            spending_summary: tool({
              description: "Total spent in a date range with breakdown by category, payment method and top merchants. Optional category/merchant filters.",
              inputSchema: z.object({
                start_date: date,
                end_date: date,
                category: z.string().nullable().describe("Exact category name or null"),
                merchant: z.string().nullable().describe("Merchant name fragment or null"),
              }),
              execute: (input) => spendingSummary(db, input),
            }),
            list_expenses: tool({
              description: "List individual expenses in a date range, sorted by largest amount or newest. Use for 'biggest expense' questions.",
              inputSchema: z.object({
                start_date: date,
                end_date: date,
                category: z.string().nullable(),
                merchant: z.string().nullable(),
                sort: z.enum(["amount_desc", "date_desc"]),
                limit: z.number().describe("1 to 20"),
              }),
              execute: (input) => listExpenses(db, input),
            }),
            compare_periods: tool({
              description: "Compare total and per-category spending between two date ranges. Differences are first minus second.",
              inputSchema: z.object({
                first_start: date,
                first_end: date,
                second_start: date,
                second_end: date,
              }),
              execute: (input) => comparePeriods(db, input),
            }),
            budget_status: tool({
              description: "Budget limits vs actual spending for a month (overall and per category), with remaining amounts.",
              inputSchema: z.object({ year: z.number(), month: z.number().describe("1-12") }),
              execute: (input) => budgetStatus(db, input),
            }),
          },
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          abortSignal: request.signal,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: (error) => {
            console.error("assistant error", error);
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("402")) return "AI credits have run out for this workspace.";
            if (msg.includes("429")) return "Too many requests right now — try again in a moment.";
            return "The assistant couldn't answer that. Please try again.";
          },
        });
      },
    },
  },
});
