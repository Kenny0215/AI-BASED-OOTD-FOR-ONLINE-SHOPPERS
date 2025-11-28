

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { createFashionChat } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { Send, Bot, User, X, Trash2 } from 'lucide-react';

const TypingIndicator = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
  </div>
);

const MessageBubble: React.FC<{ message: ChatMessage }> = React.memo(({ message }) => {
    const isUser = message.role === 'user';
    const bubbleClass = isUser ? 'bg-amber-600 self-end' : 'bg-gray-700 self-start';
    const icon = isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-amber-400" />;

    return (
        <div className={`flex items-start gap-3 my-3 max-w-full opacity-0 ${isUser ? 'justify-end' : 'justify-start'}`} style={{ animation: `slideIn 0.4s ease-out forwards`}}>
            {!isUser && <div className="flex-shrink-0 p-1.5 bg-gray-800 rounded-full">{icon}</div>}
            <div className={`${bubbleClass} rounded-xl p-3 max-w-xs shadow-md`}>
                <p className="text-white whitespace-pre-wrap text-sm">{message.parts[0].text}</p>
            </div>
            {isUser && <div className="flex-shrink-0 p-1.5 bg-gray-800 rounded-full">{icon}</div>}
        </div>
    );
});
MessageBubble.displayName = 'MessageBubble';

interface FashionChatProps {
    isOpen: boolean;
    onClose: () => void;
}

const initialMessage: ChatMessage = {
    role: 'model',
    parts: [{ text: "Hello! I'm your AI Fashion Stylist. How can I help you find the perfect look today?" }]
};

const FashionChat: React.FC<FashionChatProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<ChatMessage[]>(() => {
    try {
        const savedHistory = localStorage.getItem('fashionChatHistory');
        const parsedHistory = savedHistory ? JSON.parse(savedHistory) : null;
        if (parsedHistory && Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            return parsedHistory;
        }
    } catch (error) {
        console.error("Failed to load chat history from localStorage:", error);
    }
    return [initialMessage];
  });
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      try {
          localStorage.setItem('fashionChatHistory', JSON.stringify(history));
      } catch (error) {
          console.error("Failed to save chat history to localStorage:", error);
      }
  }, [history]);

  useEffect(() => {
    if (isOpen) {
        setIsClosing(false);
    } else {
        const timer = setTimeout(() => setIsClosing(false), 300);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history]);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 280);
  }

  const handleClearChat = () => {
    setHistory([initialMessage]);
    localStorage.removeItem('fashionChatHistory');
    setShowClearConfirm(false);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: currentInput }] };
    
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const chat = createFashionChat(history); // History from previous render gives context
      const response = await chat.sendMessage({ message: currentInput });
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }] };
      setHistory(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having a little trouble right now. Please try again later." }] };
      setHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen && !isClosing) return null;

  return (
    <div className={`fixed bottom-24 right-5 sm:right-10 w-[calc(100vw-40px)] max-w-sm h-[70vh] max-h-[500px] z-40 rounded-2xl shadow-2xl flex flex-col bg-gray-900/80 backdrop-blur-lg border border-gray-700 origin-bottom-right ${isOpen ? 'chat-window-enter' : 'chat-window-exit'}`}>
        <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
            <h3 className="font-bold text-lg text-amber-400">Fashion Chat</h3>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowClearConfirm(true)} 
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    aria-label="Clear chat history"
                >
                    <Trash2 size={20} />
                </button>
                <button onClick={handleClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close chat">
                    <X size={20} />
                </button>
            </div>
        </header>

      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
        {history.map((msg, index) => <MessageBubble key={index} message={msg} />)}
        {isLoading && (
          <div className="flex items-start gap-3 my-4 justify-start">
             <div className="flex-shrink-0 p-1.5 bg-gray-800 rounded-full"><Bot className="w-5 h-5 text-amber-400" /></div>
            <div className="bg-gray-700 rounded-xl p-3">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700 flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-gray-700 border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white transition-shadow text-sm"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-amber-600 p-2.5 rounded-lg text-white hover:bg-amber-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95">
          <Send className="w-5 h-5" />
        </button>
      </form>
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-10 fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center shadow-2xl">
                <h4 className="font-bold text-white text-lg mb-2">Clear Chat History?</h4>
                <p className="text-gray-400 text-sm mb-6">This will permanently delete all messages.</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="px-6 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleClearChat}
                        className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors"
                    >
                        Clear Chat
                    </button>
                </div>
            </div>
        </div>
    )}
    </div>
  );
};

export default FashionChat;