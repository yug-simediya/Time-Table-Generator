
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Loader2, Info } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const SchediniChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello! I am Schedini, your EasySched assistant. I can help you with app features or general school management queries. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userMessage }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        You are Schedini, an intelligent AI assistant embedded within the "EasySched" application.
        
        **Your Goal:** Provide expert assistance regarding the EasySched app features and general school management/administration topics.
        
        **EasySched App Context & Features:**
        1. **Configuration:** Setting up Standards (Grades 1-12), Streams (Science, Commerce, Arts), and Divisions. Drag-and-drop ordering.
        2. **Timings:** Defining lecture slots, durations, and recess breaks. Auto-timing logic exists where changing an end time updates the next start time.
        3. **Subjects:** Adding subjects to specific standards, setting weekly lecture counts, and color coding.
        4. **Teachers (Faculty):** Managing teacher profiles, assigning them to subjects/classes, and managing their unavailability (busy slots).
        5. **Schedule:** Generating automatic conflict-free schedules using a backtracking algorithm. Support for PDF and Excel export.
        6. **Members:** Managing user roles (Principal, Supervisor, Teacher) in collaborative groups.

        **Rules:**
        1. **Strictly Topic Bound:** You must ONLY answer questions related to the EasySched app features, troubleshooting within the app, or general school management/educational administration (e.g., "How to balance teacher workload?", "Best practices for timetable construction").
        2. **Refusal:** If a user asks about general world knowledge, coding, math problems, creative writing, or anything unrelated to the app or school management, politely refuse and remind them of your purpose as Schedini.
        3. **Tone:** Professional, helpful, encouraging, and concise. Use "we" when referring to the app features.
        4. **Identity:** Never break character. You are Schedini.
      `;

      // Construct chat history for the prompt context
      // Note: We are using generateContent for simplicity here, but maintaining a chat object is also possible. 
      // For a single-turn feel with history context, we append history to the prompt or use chat mode.
      // Let's use the chat model properly.
      
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const resultStream = await chat.sendMessageStream({ message: userMessage });

      // Create a placeholder for the model response
      const responseId = crypto.randomUUID();
      let fullResponseText = '';
      
      setMessages(prev => [...prev, { id: responseId, role: 'model', text: '' }]);

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponseText += c.text;
          setMessages(prev => 
            prev.map(msg => msg.id === responseId ? { ...msg, text: fullResponseText } : msg)
          );
        }
      }

    } catch (error: any) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: "I'm sorry, I encountered an issue connecting to my brain (Gemini). Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fade-in gap-4">
      <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 border-b border-[#27272a] bg-[#121212] flex items-center justify-between z-10">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-brand-lime/10 border border-brand-lime flex items-center justify-center shadow-glow">
                <Sparkles size={20} className="text-brand-lime" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-white">Schedini AI</h3>
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-xs text-brand-muted">Online • Powered by Gemini 3 Pro</p>
               </div>
             </div>
           </div>
           
           <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#18181b] rounded-full border border-[#27272a] text-[10px] text-brand-muted">
              <Info size={12} />
              <span>Ask about app features or school management</span>
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-[#18181b] border border-brand-lime/50 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles size={14} className="text-brand-lime" />
                </div>
              )}
              
              <div 
                className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-brand-lime text-black font-medium rounded-tr-sm' 
                    : 'bg-[#1f1f22] text-brand-text border border-[#27272a] rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={14} className="text-brand-muted" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 justify-start">
               <div className="w-8 h-8 rounded-full bg-[#18181b] border border-brand-lime/50 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-brand-lime" />
               </div>
               <div className="bg-[#1f1f22] border border-[#27272a] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce delay-75"></span>
                 <span className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce delay-150"></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#121212] border-t border-[#27272a]">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Schedini about scheduling, features, or school management..."
              className="w-full bg-[#050505] border border-[#27272a] rounded-xl pl-4 pr-12 py-4 text-white focus:border-brand-lime outline-none resize-none h-14 max-h-32 scrollbar-thin transition-colors text-sm"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 p-2 bg-brand-lime text-black rounded-lg hover:bg-brand-limeDark disabled:opacity-50 disabled:bg-[#27272a] disabled:text-brand-muted transition-all"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-center text-brand-muted mt-2">
            Schedini can make mistakes. Please double-check critical school management information.
          </p>
        </div>

      </div>
    </div>
  );
};

export default SchediniChat;
