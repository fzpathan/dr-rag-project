/**
 * Query types.
 */

export interface Citation {
  source: string;
  page: number | null;
  excerpt: string;
}

export interface QueryRequest {
  question: string;
  source_filter?: string[];
  top_k?: number;
}

export interface QueryResponse {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  sources_used: string[];
  processing_time_ms: number;
  cached: boolean;
  created_at: string;
}

export interface SourcesResponse {
  sources: string[];
  count: number;
}

export interface StatsResponse {
  status: string;
  document_count: number;
  collection_name: string;
  sources: string[];
}

export interface QueryHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  cached: boolean;
}
