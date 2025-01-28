import { injectable } from "inversify";
import path from "path";
import { v4 } from "uuid";
import type {
    IAgentRuntime,
    ICacheManager,
    Memory,
    Provider,
    State,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { globalContainer, type InjectableProvider } from "@elizaos/plugin-di";

/**
 * Cache provider
 */
@injectable()
export class CacheProvider
    implements Provider, InjectableProvider<ICacheManager>
{
    private readonly _nodeCache: NodeCache;
    private readonly cacheKey: string = "fixes-ai/shared-cache";
    private readonly CACHE_EXPIRY_SEC = 120; // Cache TTL set to 2 minutes
    private readonly providerId: string;
    private _fileCache: ICacheManager;

    /**
     * Initialize the Flow connector provider
     * @param flowJSON The Flow JSON object
     */
    constructor() {
        this._nodeCache = new NodeCache({ stdTTL: this.CACHE_EXPIRY_SEC });
        this.providerId = v4();
    }

    /**
     * Get the cache manager instance
     * @param runtime The runtime object from Eliza framework
     */
    async getInstance(runtime: IAgentRuntime): Promise<ICacheManager> {
        if (!this._fileCache) {
            this._fileCache = runtime.cacheManager;
        }
        return this._fileCache;
    }

    /**
     * Eliza provider `get` method
     * @returns The message to be injected into the context
     */
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
    ): Promise<string | null> {
        // ensure the cache manager is initialized
        await this.getInstance(runtime);
        return null;
    }

    /**
     * Get cached data
     */
    public async getCachedData<T>(key: string): Promise<T | null> {
        // Check in-memory cache first
        const cachedData = this._nodeCache.get<T>(key);
        if (cachedData) {
            return cachedData;
        }

        // Check file-based cache
        const fileCachedData = await this._readFromCache<T>(key);
        if (fileCachedData) {
            // Populate in-memory cache
            this._nodeCache.set(key, fileCachedData);
            return fileCachedData;
        }

        return null;
    }

    /**
     * Set cached data in file-based cache
     * @param cacheKey The cache key
     * @param data The data to cache
     * @param ttl The time-to-live in seconds, defaults to 120 seconds, if not provided
     */
    public async setCachedData<T>(
        cacheKey: string,
        data: T,
        ttl?: number,
    ): Promise<void> {
        // Set in-memory cache
        this._nodeCache.set(cacheKey, data);

        // Write to file-based cache
        await this._writeToCache(cacheKey, data, ttl);
    }

    // ---- Internal methods ----

    private _getFileCacheKey(key: string) {
        return path.join(this.cacheKey, this.providerId, key);
    }

    private async _readFromCache<T>(key: string): Promise<T | null> {
        if (!this._fileCache) {
            return null;
        }
        return await this._fileCache.get<T>(this._getFileCacheKey(key));
    }

    private async _writeToCache<T>(
        key: string,
        data: T,
        ttl?: number,
    ): Promise<void> {
        await this._fileCache?.set(this._getFileCacheKey(key), data, {
            expires: Date.now() + (ttl ?? this.CACHE_EXPIRY_SEC) * 1000,
        });
    }
}

// Cache provider is bound to request scope
globalContainer.bind<CacheProvider>(CacheProvider).toSelf().inRequestScope();
