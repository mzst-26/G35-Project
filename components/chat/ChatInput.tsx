/**
 * ChatInput Component
 * 
 * Handles user input in the chat interface.
 * Contains a text input field and a send button.
 * 
 * Features:
 * - Text input for typing messages
 * - Send button with icon
 * - Enter key support (press Enter to send)
 * - Disables input when AI is typing
 * - Validates input (can't send empty messages)
 * 
 */

'use client';

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Props interface 
interface ChatInputProps {
  value: string;              // Current text in the input field
  onChange: (value: string) => void;  // Called when user types
  onSend: () => void;          // Called when user sends message
  disabled?: boolean;          // Optional: disable input while AI is typing
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  // Handle Enter key press to send message
  // This makes UX better - users don't have to click the button
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      onSend();
    }
  };

  return (
    // Container with border on top to separate from messages
    <div className="border-t border-white/20 p-4 bg-gradient-to-r from-white/50 to-blue-50/50">
      <div className="flex gap-2">
        {/* Text input field */}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)} // Pass new value to parent
          onKeyPress={handleKeyPress} // Handle Enter key
          placeholder="Type your message..."
          className="flex-1 bg-white/70 border-white/20 focus:ring-2 focus:ring-blue-500"
          disabled={disabled} // Disable when AI is typing
        />
        
        {/* Send button */}
        <Button
          onClick={onSend}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          disabled={disabled || !value.trim()} // Disable if typing or input is empty
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
