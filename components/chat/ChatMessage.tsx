/**
 * ChatMessage Component
 * 
 * This component displays a single message in the chat interface.
 * It can show either a user message or an AI assistant message.
 * 
 * Features:
 * - Different styling for user vs AI messages
 * - Avatar icons (Bot for AI, User for human)
 * - Message content and timestamp
 * - Responsive layout that aligns user messages to the right
 * 
 */

'use client';

import { Bot, User } from 'lucide-react';
import { Message } from '@/types/chat';

// Props interface
interface ChatMessageProps {
  message: Message; // The message object containing content, role, timestamp, etc.
}

export function ChatMessage({ message }: ChatMessageProps) {
  // Check if message is from user (not AI assistant)
  // This helps us style user and AI messages differently
  const isUser = message.role === 'user';

  return (
    // Main container - flexbox to layout avatar and message
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* AI Avatar - only show for assistant messages */}
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-blue-600" />
        </div>
      )}

      {/* Message bubble - styling changes based on who sent it */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' // User: blue gradient
            : 'bg-white/90 text-slate-900 border border-white/20 shadow-md' // AI: white with border
        }`}
      >
        {/* The actual message text */}
        <p className="text-sm">{message.content}</p>
        
        {/* Timestamp - convert ISO string to readable time */}
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-slate-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* User Avatar - only show for user messages */}
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-slate-600" />
        </div>
      )}
    </div>
  );
}
