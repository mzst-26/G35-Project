/**
 * TypingIndicator Component
 * 
 * Shows an animated "AI is typing" indicator.
 * Appears when the AI is processing and about to respond.
 * 
 * How it works:
 * - Shows a bot avatar (same as AI messages)
 * - Three dots that bounce up and down
 * - Each dot has a different animation delay to create a wave effect
 * 
 */

'use client';

import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      {/* Bot avatar - same style as AI messages */}
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
        <Bot className="h-5 w-5 text-blue-600" />
      </div>
      
      {/* Message bubble containing the animated dots */}
      <div className="bg-white/90 rounded-2xl px-4 py-3 border border-white/20">
        <div className="flex gap-1">
          {/* Create 3 dots using array map */}
          {/* Each dot gets a staggered animation delay for wave effect */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }} // 0s, 0.2s, 0.4s delays
            />
          ))}
        </div>
      </div>
    </div>
  );
}
