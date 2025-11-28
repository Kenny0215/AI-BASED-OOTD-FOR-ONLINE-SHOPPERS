import React, { useState } from 'react';
import FashionChat from '../FashionChat';
import { MessageSquare, X } from 'lucide-react';

const FloatingChatBubble: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="chat-bubble-enter fixed bottom-5 right-5 sm:bottom-10 sm:right-10 z-50 bg-amber-500 text-gray-900 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform transform hover:scale-110 active:scale-95 animate-pulse"
        style={{ animationIterationCount: '3' }}
        aria-label={isChatOpen ? "Close chat" : "Open chat"}
      >
        {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>
      <FashionChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

export default FloatingChatBubble;