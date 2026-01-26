export interface Message {
  id: string; // UUID-compatible
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string format
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
}
