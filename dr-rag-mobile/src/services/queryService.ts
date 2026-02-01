/**
 * Query service for RAG operations.
 */

import api from './api';
import { endpoints, timeouts } from '../constants/api';
import type {
  QueryRequest,
  QueryResponse,
  SourcesResponse,
  StatsResponse,
  TranscribeResponse,
} from '../types/query';

export const queryService = {
  /**
   * Submit a remedy query.
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await api.post<QueryResponse>(endpoints.query, request, {
      timeout: timeouts.query,
    });
    return response.data;
  },

  /**
   * Get available sources.
   */
  async getSources(): Promise<SourcesResponse> {
    const response = await api.get<SourcesResponse>(endpoints.sources);
    return response.data;
  },

  /**
   * Get knowledge base stats.
   */
  async getStats(): Promise<StatsResponse> {
    const response = await api.get<StatsResponse>(endpoints.stats);
    return response.data;
  },

  /**
   * Get cache stats.
   */
  async getCacheStats(): Promise<any> {
    const response = await api.get(endpoints.cacheStats);
    return response.data;
  },

  /**
   * Transcribe audio to text.
   */
  async transcribe(audioUri: string, language: string = 'en'): Promise<TranscribeResponse> {
    const formData = new FormData();

    // Get file info from URI
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : 'audio/m4a';

    formData.append('audio', {
      uri: audioUri,
      type,
      name: filename,
    } as any);

    formData.append('language', language);

    const response = await api.post<TranscribeResponse>(endpoints.transcribe, formData, {
      timeout: timeouts.upload,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Health check.
   */
  async healthCheck(): Promise<any> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default queryService;
