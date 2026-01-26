/**
 * ChatMessagesList Component
 * 
 * Container that displays all chat messages in a scrollable area.
 * Automatically scrolls to the bottom when new messages arrive.
 * 
 * Features:
 * - Scrollable container for messages
 * - Auto-scroll to latest message
 * - Shows typing indicator when AI is responding
 * - Maps through messages array to render each one
 * 
 * Learning notes:
 * - useRef: Creates a reference to the DOM element for scrolling
 * - useEffect: Runs code when messages change (React lifecycle)
 * - Marked with 'use client' because of using React hooks
 */

'use client';

import { useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';

// Props interface - what this component needs from parent
interface ChatMessagesListProps {
  messages: Message[];  // Array of all messages to display
  isTyping: boolean;    // Whether AI is currently typing
}

export function ChatMessagesList({ messages, isTyping }: ChatMessagesListProps) {
  // useRef: Creates a reference to the scrollable div
  // We need this to programmatically scroll to the bottom
  const containerRef = useRef<HTMLDivElement>(null);

  // useEffect: Runs after every render when messages or isTyping changes
  // This automatically scrolls to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      // scrollTop = how far we've scrolled
      // scrollHeight = total height of content
      // Setting scrollTop to scrollHeight scrolls all the way down
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isTyping]); // Re-run when messages or typing state changes

  return (
    // Scrollable container for messages
    // flex-1: Takes up all available space
    // overflow-y-auto: Adds scrollbar when content overflows
    // ref: Connects to our containerRef for auto-scrolling
    <div className="flex-1 overflow-y-auto py-6 px-6 space-y-4" ref={containerRef}>
      
      {/* Loop through all messages and render each one */}
      {/* key={message.id} helps React efficiently update the list */}
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      
      {/* Show typing indicator when AI is thinking */}
      {/* && means "only render if isTyping is true" */}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
