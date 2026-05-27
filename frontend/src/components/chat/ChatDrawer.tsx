import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { useSendChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/types";

const STARTER: ChatMessage = {
  role: "assistant",
  content:
    "Hi — I'm your stock assistant. Ask about quotes, news, or your portfolio (when signed in).",
};

export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER]);
  const sendChat = useSendChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sendChat.isPending) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    try {
      const { answer } = await sendChat.mutateAsync(next);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err: unknown) {
      let msg = "Failed to reach chat service.";
      if (err && typeof err === "object" && "response" in err) {
        const data = (err as { response?: { data?: { detail?: string } } })
          .response?.data;
        if (data?.detail) msg = String(data.detail);
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: msg },
      ]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(520px,80vh)] w-[min(400px,92vw)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Stock Expert
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={clsx(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200"
                )}
              >
                {m.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-gray-100 p-3 dark:border-slate-800"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a stock…"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            />
            <Button type="submit" size="sm" disabled={sendChat.isPending}>
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

// export txLabel for insider component - actually remove unused txLabel from ChatDrawer