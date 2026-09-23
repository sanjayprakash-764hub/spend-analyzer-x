import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { BarChart3, CalendarRange, IndianRupee, PiggyBank, ReceiptText, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { iso } from "@/lib/expenses";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolPart } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Ask about your spending · Spend Manager" },
      { name: "description", content: "Ask questions about your expenses in plain language. Answers use your real recorded numbers." },
      { property: "og:title", content: "Spending assistant · Spend Manager" },
      { property: "og:description", content: "Chat with an assistant that looks up your real expense totals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "How much did I spend on food this month?",
  "What was my biggest expense?",
  "Compare this month with last month.",
  "Where am I spending too much?",
];

const TOOL_LABELS: Record<string, { label: string; icon: typeof BarChart3 }> = {
  spending_summary: { label: "Looked up spending totals", icon: BarChart3 },
  list_expenses: { label: "Looked up expenses", icon: ReceiptText },
  compare_periods: { label: "Compared periods", icon: CalendarRange },
  budget_status: { label: "Checked your budget", icon: PiggyBank },
};

function AssistantPage() {
  const { user } = useSession();
  const storageKey = user ? `spend-assistant:${user.id}` : null;
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setInitial(raw ? (JSON.parse(raw) as UIMessage[]) : []);
    } catch {
      setInitial([]);
    }
  }, [storageKey]);

  if (!storageKey || initial === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  return <ChatWindow key={storageKey} storageKey={storageKey} initialMessages={initial} />;
}

function ChatWindow({ storageKey, initialMessages }: { storageKey: string; initialMessages: UIMessage[] }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ today: iso(new Date()) }),
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: storageKey,
    messages: initialMessages,
    transport,
    onError: (error) => toast.error(error.message || "The assistant couldn't answer. Try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "streaming") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-60)));
    } catch {
      /* storage full — ignore */
    }
  }, [messages, status, storageKey]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  function ask(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    void sendMessage({ text: value });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-3xl flex-col md:h-[calc(100vh-9rem)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <IndianRupee className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Ask about your spending</h1>
            <p className="text-xs text-muted-foreground">Numbers come straight from your recorded expenses.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stop();
              setMessages([]);
              window.localStorage.removeItem(storageKey);
            }}
          >
            <RotateCcw className="size-4" /> Clear chat
          </Button>
        )}
      </div>

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ask anything about where your money went. Try one of these:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent
                  className={
                    message.role === "user"
                      ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                      : "bg-transparent p-0"
                  }
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return message.role === "user" ? (
                        <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                      ) : (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const tp = part as ToolPart;
                      const name = part.type.slice(5);
                      const meta = TOOL_LABELS[name];
                      const Icon = meta?.icon ?? BarChart3;
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader
                            type={tp.type as `tool-${string}`}
                            state={tp.state}
                            title={meta?.label ?? name}
                          />
                          <ToolContent>
                            <div className="flex items-center gap-2 px-4 pt-3 text-xs text-muted-foreground">
                              <Icon className="size-3.5" /> Read from your records
                            </div>
                            <ToolInput input={tp.input} />
                            <ToolOutput output={tp.output} errorText={tp.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}

            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent className="bg-transparent p-0">
                  <Shimmer>Looking at your expenses…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          <PromptInput onSubmit={(msg) => ask(msg.text ?? "")}>
            <PromptInputTextarea
              ref={textareaRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How much did I spend on Swiggy in August?"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!busy && !input.trim()} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
