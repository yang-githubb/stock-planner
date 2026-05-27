import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/api/chat";
import type { ChatMessage } from "@/types";

export function useSendChat() {
  return useMutation({
    mutationFn: (messages: ChatMessage[]) => sendChatMessage(messages),
  });
}
