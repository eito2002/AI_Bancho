// 基本的な型定義
export interface Topic {
  id: string;
  name: string;
  goal?: string;
  axes: string[];
}

export interface Idea {
  id: string;
  name: string;
  description?: string;
  evaluations: Record<string, string>;
}

export interface TopicDetail {
  id: string;
  name: string;
  goal?: string;
  axes: string[];
  ideas: Idea[];
  transcript?: TranscriptData;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 文字起こし関連型
export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker?: string;
  text: string;
  confidence?: number;
}

export interface TranscriptData {
  entries: TranscriptEntry[];
  summary?: string;
  lastUpdated: Date;
}

// 採決リクエスト型（修正版）
export interface JudgeRequest {
  topicId: string;
  selectedAxes: string[];
  transcript?: string;
  ideas: Idea[];
}

// 採決結果型（修正版）
export interface JudgeResult {
  winner: {
    id: string;
    name: string;
  };
  ranking: Array<{
    ideaId: string;
    ideaName: string;
    score: number;
  }>;
  axisWinners: Record<
    string,
    {
      id: string;
      name: string;
      reason: string;
    }
  >;
  usedAxes: string[];
  reasoning: string;
  transcriptSummary?: string;
}

// チャット関連型
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IdeaEvaluationChat {
  ideaName: string;
  description?: string;
  axes: string[];
  currentAxisIndex: number;
  evaluations: Record<string, string>;
  messages: ChatMessage[];
}

// AIサジェスチョン関連型
export interface SuggestedAxis {
  name: string;
  reason: string;
}

export interface SuggestedIdea {
  name: string;
  description: string;
  reason: string;
}

export interface SuggestAxesRequest {
  topicName: string;
  goal?: string;
  existingAxes: string[];
  transcript?: string;
  ideas: Array<{
    name: string;
    description?: string;
  }>;
}

export interface SuggestIdeasRequest {
  topicName: string;
  goal?: string;
  axes: string[];
  transcript?: string;
  existingIdeas: Array<{
    name: string;
    description?: string;
  }>;
}
