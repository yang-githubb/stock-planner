import api from "./client";
import type { ChatMessage } from "@/types";

export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<{ answer: string }> {
  const { data } = await api.post<{ answer: string }>("/chat/", {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return data;
}
