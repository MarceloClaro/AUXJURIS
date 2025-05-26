
import type { Part, Content } from "@google/genai"; // For Gemini chat history

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  sources?: { uri: string; title: string }[]; // For Gemini grounding
}

export interface SwotAnalysis {
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  threats?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  text: string;
  file: File;
  summary?: string;
  insights?: string;
  swot?: SwotAnalysis;
  processingAnalysis?: boolean;
  analysisError?: string | null;
}

export interface RagDataItem {
  documentName: string;
  content: string; // Original text
  summary?: string;
  insights?: string;
  swot?: SwotAnalysis; 
}

export type RagData = RagDataItem[];

export type ComparisonSource = 'uploadedDocId' | 'lastAiResponse' | null;

// Gemini chat history part
// FIX: Changed GeminiHistoryPart from Part to Content to match the expected type for chat history.
export type GeminiHistoryPart = Content;