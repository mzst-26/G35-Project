/**
 * ChatInterface Component
 * 
 * Main container for the entire chat UI.
 * Combines all chat sub-components into a complete interface.
 * 
 * Structure:
 * 1. Header with AI bot icon and title
 * 2. ChatMessagesList (scrollable messages area)
 * 3. ChatInput (input field at bottom)
 * 
 * It receives all chat state from the parent and passes it down.
 * 
 * Learning note: This follows the "container component" pattern
 * It composes smaller components together but doesn't have its own logic
 */

'use client';

import { Bot, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessagesList } from './ChatMessagesList';
import { ChatInput } from './ChatInput';
import { Message } from '@/types/chat';

// Props - all the data and functions passed from parent component
interface ChatInterfaceProps {
  messages: Message[];              // All chat messages
  isTyping: boolean;                // Is AI currently typing?
  inputValue: string;               // Current text in input field
  onInputChange: (value: string) => void;  // Called when user types
  onSendMessage: () => void;        // Called when user sends message
}

export function ChatInterface({
  messages,
  isTyping,
  inputValue,
  onInputChange,
  onSendMessage,
}: ChatInterfaceProps) {
  return (
    // Main Card container for the chat
    <Card className="shadow-2xl bg-white/80 border-white/20 h-[calc(100vh-12rem)]">
      
      {/* Header Section - shows bot icon and title */}
      <CardHeader className="border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
        <div className="flex items-center gap-3">
          {/* Bot Avatar Circle */}
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          
          {/* Title and subtitle */}
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Job Assistant
              <Sparkles className="h-4 w-4 text-yellow-500" /> {/* Sparkle icon for AI */}
            </CardTitle>
            <p className="text-sm text-slate-500">Chat to create your job request</p>
          </div>
        </div>
      </CardHeader>

      {/* Main Content Area - messages and input */}
      <CardContent className="flex flex-col h-[calc(100%-6rem)] p-0">
        
        {/* Messages area - takes up most of the space */}
        <ChatMessagesList messages={messages} isTyping={isTyping} />
        
        {/* Input area - stuck to the bottom */}
        {/* disabled={isTyping}: Can't type new message while AI is responding */}
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSendMessage}
          disabled={isTyping}
        />
      </CardContent>
    </Card>
  );
}
