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
   * Health check.
   */
  async healthCheck(): Promise<any> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default queryService;
