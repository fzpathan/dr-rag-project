"""
Caching service for repeated queries.
"""
import time
import json
import logging
from hashlib import sha256
from typing import Dict, Any, Optional, List
from threading import Lock

from api.config import api_config

logger = logging.getLogger(__name__)


class QueryCache:
    """
    In-memory LRU cache for query results.

    Features:
    - Query normalization for better hit rates
    - TTL-based expiration
    - LRU eviction when max size is reached
    - Thread-safe operations
    """

    def __init__(
        self,
        max_size: int = None,
        ttl_hours: int = None,
    ):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._access_order: List[str] = []  # For LRU tracking
        self._max_size = max_size or api_config.CACHE_MAX_SIZE
        self._ttl = (ttl_hours or api_config.CACHE_TTL_HOURS) * 3600
        self._lock = Lock()
        self._hits = 0
        self._misses = 0

    def _normalize_query(self, query: str) -> str:
        """Normalize query for better cache hit rates."""
        # Lowercase, strip whitespace, collapse multiple spaces
        normalized = " ".join(query.lower().strip().split())
        return normalized

    def _make_key(self, query: str, source_filter: Optional[List[str]] = None) -> str:
        """Create a cache key from query and filters."""
        normalized = self._normalize_query(query)
        filter_str = json.dumps(sorted(source_filter or []))
        combined = f"{normalized}:{filter_str}"
        return sha256(combined.encode()).hexdigest()

    def _update_access_order(self, key: str):
        """Update LRU access order."""
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)

    def _evict_oldest(self):
        """Evict oldest entry if cache is full."""
        if len(self._cache) >= self._max_size and self._access_order:
            oldest_key = self._access_order.pop(0)
            if oldest_key in self._cache:
                del self._cache[oldest_key]
                logger.debug(f"Evicted oldest cache entry: {oldest_key[:8]}...")

    def get(
        self,
        query: str,
        source_filter: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached response for a query.

        Args:
            query: The search query
            source_filter: Optional list of sources to filter by

        Returns:
            Cached response dict or None if not found/expired
        """
        key = self._make_key(query, source_filter)

        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            entry = self._cache[key]

            # Check if expired
            if time.time() - entry["timestamp"] > self._ttl:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
                self._misses += 1
                logger.debug(f"Cache entry expired: {key[:8]}...")
                return None

            # Update access order for LRU
            self._update_access_order(key)
            self._hits += 1

            logger.info(f"Cache hit for query: {query[:50]}...")
            return entry["response"]

    def set(
        self,
        query: str,
        response: Dict[str, Any],
        source_filter: Optional[List[str]] = None,
    ):
        """
        Cache a query response.

        Args:
            query: The search query
            response: The response to cache
            source_filter: Optional list of sources used
        """
        key = self._make_key(query, source_filter)

        with self._lock:
            # Evict if needed
            if key not in self._cache:
                self._evict_oldest()

            self._cache[key] = {
                "response": response,
                "timestamp": time.time(),
                "query": query,
            }
            self._update_access_order(key)

            logger.info(f"Cached response for query: {query[:50]}...")

    def invalidate(self, query: str = None, source_filter: Optional[List[str]] = None):
        """
        Invalidate cache entries.

        Args:
            query: Specific query to invalidate (or all if None)
            source_filter: Source filter for specific invalidation
        """
        with self._lock:
            if query:
                key = self._make_key(query, source_filter)
                if key in self._cache:
                    del self._cache[key]
                    if key in self._access_order:
                        self._access_order.remove(key)
            else:
                # Clear all
                self._cache.clear()
                self._access_order.clear()
                logger.info("Cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_percent": round(hit_rate, 2),
                "ttl_hours": self._ttl / 3600,
            }


# Global cache instance
query_cache = QueryCache()
