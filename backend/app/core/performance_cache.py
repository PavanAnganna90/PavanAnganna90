"""
Performance-optimized caching layer for OpsSight backend.
Implements intelligent caching strategies for different data types.
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional, Set, Union, Callable
from datetime import datetime, timedelta
from functools import wraps
from dataclasses import dataclass
from enum import Enum
import hashlib

import redis.asyncio as redis
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class CacheStrategy(Enum):
    """Caching strategies for different data types."""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TTL = "ttl"  # Time To Live
    WRITE_THROUGH = "write_through"  # Write through cache
    WRITE_BACK = "write_back"  # Write back cache


@dataclass
class CacheConfig:
    """Configuration for cache behavior."""
    ttl: int = 300  # Time to live in seconds
    strategy: CacheStrategy = CacheStrategy.TTL
    max_size: int = 1000  # Maximum cache size
    compress: bool = False  # Enable compression
    serialize: bool = True  # Enable serialization


class PerformanceCache:
    """High-performance caching layer with multiple strategies."""
    
    def __init__(self, redis_client: redis.Redis, config: CacheConfig):
        self.redis = redis_client
        self.config = config
        self.local_cache: Dict[str, Any] = {}
        self.access_count: Dict[str, int] = {}
        self.access_time: Dict[str, float] = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_requests': 0,
        }
    
    def _generate_key(self, key: str, namespace: str = "default") -> str:
        """Generate cache key with namespace."""
        return f"opsight:{namespace}:{key}"
    
    def _serialize_value(self, value: Any) -> bytes:
        """Serialize value for storage."""
        if self.config.serialize:
            return json.dumps(value, default=str).encode('utf-8')
        return str(value).encode('utf-8')
    
    def _deserialize_value(self, value: bytes) -> Any:
        """Deserialize value from storage."""
        if self.config.serialize:
            return json.loads(value.decode('utf-8'))
        return value.decode('utf-8')
    
    def _compress_value(self, value: bytes) -> bytes:
        """Compress value if enabled."""
        if self.config.compress:
            import zlib
            return zlib.compress(value)
        return value
    
    def _decompress_value(self, value: bytes) -> bytes:
        """Decompress value if enabled."""
        if self.config.compress:
            import zlib
            return zlib.decompress(value)
        return value
    
    def _should_evict(self) -> bool:
        """Check if cache should evict items."""
        return len(self.local_cache) >= self.config.max_size
    
    def _evict_item(self) -> None:
        """Evict item based on strategy."""
        if not self.local_cache:
            return
        
        if self.config.strategy == CacheStrategy.LRU:
            # Evict least recently used
            oldest_key = min(self.access_time.keys(), key=lambda k: self.access_time[k])
            self._remove_from_local_cache(oldest_key)
        elif self.config.strategy == CacheStrategy.LFU:
            # Evict least frequently used
            least_used_key = min(self.access_count.keys(), key=lambda k: self.access_count[k])
            self._remove_from_local_cache(least_used_key)
        else:
            # Default: remove random item
            key = next(iter(self.local_cache))
            self._remove_from_local_cache(key)
        
        self.cache_stats['evictions'] += 1
    
    def _remove_from_local_cache(self, key: str) -> None:
        """Remove item from local cache."""
        self.local_cache.pop(key, None)
        self.access_count.pop(key, None)
        self.access_time.pop(key, None)
    
    def _update_access_stats(self, key: str) -> None:
        """Update access statistics."""
        self.access_count[key] = self.access_count.get(key, 0) + 1
        self.access_time[key] = time.time()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def get(self, key: str, namespace: str = "default") -> Optional[Any]:
        """Get value from cache with fallback layers."""
        self.cache_stats['total_requests'] += 1
        cache_key = self._generate_key(key, namespace)
        
        # Check local cache first
        if cache_key in self.local_cache:
            self._update_access_stats(cache_key)
            self.cache_stats['hits'] += 1
            return self.local_cache[cache_key]
        
        # Check Redis cache
        try:
            redis_value = await self.redis.get(cache_key)
            if redis_value:
                # Decompress and deserialize
                decompressed = self._decompress_value(redis_value)
                value = self._deserialize_value(decompressed)
                
                # Store in local cache
                if self._should_evict():
                    self._evict_item()
                
                self.local_cache[cache_key] = value
                self._update_access_stats(cache_key)
                self.cache_stats['hits'] += 1
                return value
        except Exception as e:
            logger.warning(f"Redis cache error: {e}")
        
        self.cache_stats['misses'] += 1
        return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def set(self, key: str, value: Any, ttl: Optional[int] = None, namespace: str = "default") -> bool:
        """Set value in cache with multiple layers."""
        cache_key = self._generate_key(key, namespace)
        ttl = ttl or self.config.ttl
        
        # Store in local cache
        if self._should_evict():
            self._evict_item()
        
        self.local_cache[cache_key] = value
        self._update_access_stats(cache_key)
        
        # Store in Redis cache
        try:
            # Serialize and compress
            serialized = self._serialize_value(value)
            compressed = self._compress_value(serialized)
            
            await self.redis.setex(cache_key, ttl, compressed)
            return True
        except Exception as e:
            logger.warning(f"Redis cache set error: {e}")
            return False
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """Delete value from cache."""
        cache_key = self._generate_key(key, namespace)
        
        # Remove from local cache
        self._remove_from_local_cache(cache_key)
        
        # Remove from Redis cache
        try:
            await self.redis.delete(cache_key)
            return True
        except Exception as e:
            logger.warning(f"Redis cache delete error: {e}")
            return False
    
    async def clear_namespace(self, namespace: str = "default") -> bool:
        """Clear all keys in namespace."""
        pattern = f"opsight:{namespace}:*"
        
        # Clear local cache
        keys_to_remove = [k for k in self.local_cache.keys() if k.startswith(f"opsight:{namespace}:")]
        for key in keys_to_remove:
            self._remove_from_local_cache(key)
        
        # Clear Redis cache
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
            return True
        except Exception as e:
            logger.warning(f"Redis cache clear error: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.cache_stats['total_requests']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self.cache_stats,
            'hit_rate': hit_rate,
            'local_cache_size': len(self.local_cache),
            'config': {
                'ttl': self.config.ttl,
                'strategy': self.config.strategy.value,
                'max_size': self.config.max_size,
                'compress': self.config.compress,
            }
        }
    
    def get_stats_sync(self) -> Dict[str, Any]:
        """Get cache statistics synchronously."""
        total_requests = self.cache_stats['total_requests']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self.cache_stats,
            'hit_rate': hit_rate,
            'local_cache_size': len(self.local_cache),
        }


class CacheManager:
    """Manages multiple cache instances with different configurations."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.caches: Dict[str, PerformanceCache] = {}
    
    def get_cache(self, name: str, config: Optional[CacheConfig] = None) -> PerformanceCache:
        """Get or create a cache instance."""
        if name not in self.caches:
            config = config or CacheConfig()
            self.caches[name] = PerformanceCache(self.redis, config)
        return self.caches[name]
    
    async def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all caches."""
        stats = {}
        for name, cache in self.caches.items():
            stats[name] = await cache.get_stats()
        return stats


# Cache decorators for different use cases
def cache_result(
    cache_name: str = "default",
    ttl: int = 300,
    key_generator: Optional[Callable] = None,
    namespace: str = "function_cache"
):
    """Decorator for caching function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Get cache manager (should be injected)
            cache_manager = kwargs.get('cache_manager')
            if not cache_manager:
                return await func(*args, **kwargs)
            
            cache = cache_manager.get_cache(cache_name)
            
            # Try to get from cache
            cached_result = await cache.get(cache_key, namespace)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl, namespace)
            return result
        
        return wrapper
    return decorator


def cache_metrics(ttl: int = 60, namespace: str = "metrics"):
    """Decorator specifically for caching metrics."""
    return cache_result(
        cache_name="metrics",
        ttl=ttl,
        namespace=namespace
    )


def cache_user_data(ttl: int = 300, namespace: str = "user_data"):
    """Decorator for caching user-specific data."""
    return cache_result(
        cache_name="user_data",
        ttl=ttl,
        namespace=namespace
    )


# Predefined cache configurations
CACHE_CONFIGS = {
    "metrics": CacheConfig(ttl=60, strategy=CacheStrategy.TTL, max_size=500),
    "user_data": CacheConfig(ttl=300, strategy=CacheStrategy.LRU, max_size=1000),
    "api_responses": CacheConfig(ttl=120, strategy=CacheStrategy.LRU, max_size=2000),
    "database_queries": CacheConfig(ttl=600, strategy=CacheStrategy.LFU, max_size=1500),
    "computed_results": CacheConfig(ttl=3600, strategy=CacheStrategy.TTL, max_size=500),
}


# Global cache manager instance
_cache_manager: Optional[CacheManager] = None


async def get_cache_manager() -> CacheManager:
    """Get global cache manager instance."""
    global _cache_manager
    if _cache_manager is None:
        # Initialize Redis client
        redis_client = redis.Redis(
            host="localhost",
            port=6379,
            decode_responses=False,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        _cache_manager = CacheManager(redis_client)
    return _cache_manager


def get_cache_manager_sync() -> Optional[CacheManager]:
    """Get global cache manager instance synchronously."""
    return _cache_manager