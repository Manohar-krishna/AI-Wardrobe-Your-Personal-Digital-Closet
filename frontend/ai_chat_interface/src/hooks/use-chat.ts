import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
  useGetOpenaiConversation
} from "@workspace/api-client-react";
import { useToast } from "./use-toast";

export function useChat() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createConversation = useCreateOpenaiConversation();
  const deleteConversationMutation = useDeleteOpenaiConversation();

  const activeConversation = useGetOpenaiConversation(
    activeConversationId as number,
    { query: { enabled: !!activeConversationId, queryKey: getGetOpenaiConversationQueryKey(activeConversationId as number) } }
  );

  const deleteConversation = useCallback((id: number) => {
    deleteConversationMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      },
      onError: () => {
        toast({ title: "Failed to delete conversation", variant: "destructive" });
      }
    });
  }, [deleteConversationMutation, queryClient, activeConversationId, toast]);

  const sendMessage = useCallback(async (content: string) => {
    let convId = activeConversationId;
    
    // Create new conversation if none exists
    if (!convId) {
      try {
        const newConv = await createConversation.mutateAsync({
          data: { title: "Styling Session" }
        });
        convId = newConv.id;
        setActiveConversationId(newConv.id);
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      } catch (e) {
        toast({ title: "Failed to create conversation", variant: "destructive" });
        return;
      }
    }

    setIsStreaming(true);
    setStreamingContent("");

    // Optimistically update the UI with user's message
    const tempMessage = {
      id: Date.now(),
      conversationId: convId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };

    queryClient.setQueryData(getGetOpenaiConversationQueryKey(convId), (oldData: any) => {
      if (!oldData) return { messages: [tempMessage] };
      return {
        ...oldData,
        messages: [...(oldData.messages || []), tempMessage]
      };
    });

    try {
      const response = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                setStreamingContent(prev => prev + parsed.content);
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      
      // Invalidate to fetch the final completed messages
      await queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(convId) });
    } catch (e) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [activeConversationId, createConversation, queryClient, toast]);

  return {
    activeConversationId,
    setActiveConversationId,
    activeConversation: activeConversation.data,
    isLoadingHistory: activeConversation.isLoading,
    sendMessage,
    deleteConversation,
    streamingContent,
    isStreaming
  };
}
