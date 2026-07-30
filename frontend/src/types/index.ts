export interface StructuredAIResponse {
  message?: string;
  summary?: string[];
  emails?: EmailData[];
}

export interface EmailData {
  id: string;
  sender: string;
  senderEmail?: string;
  subject: string;
  preview?: string;
  bodyPreview?: string;
  date: string;
  status: string | string[];
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  /** Populated for AI messages that returned structured JSON (emails, summary, etc.) */
  structuredData?: StructuredAIResponse;
}

export interface ChatResponse {
  response: string;
}

export interface UserSession {
  userId: string;
  name?: string;
}
