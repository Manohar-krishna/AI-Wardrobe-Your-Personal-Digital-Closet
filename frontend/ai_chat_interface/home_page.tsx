import { motion } from "framer-motion";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { RecommendationPanel } from "@/components/chat/RecommendationPanel";
import { useChat } from "@/hooks/use-chat";

export default function Home() {
  const {
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    isLoadingHistory,
    sendMessage,
    deleteConversation,
    streamingContent,
    isStreaming,
  } = useChat();

  const handleNewChat = () => {
    setActiveConversationId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex h-screen w-screen overflow-hidden bg-background"
    >
      {/* Sidebar */}
      <Sidebar
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={handleNewChat}
        onDeleteConversation={deleteConversation}
      />

      {/* Chat Area */}
      <ChatArea
        conversation={activeConversation}
        isLoadingHistory={isLoadingHistory}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        onSendMessage={sendMessage}
      />

      {/* Recommendation Panel */}
      <RecommendationPanel />
    </motion.div>
  );
}
