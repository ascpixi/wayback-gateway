/**
 * Represents a response from the Wayback Machine.
 */
export interface WaybackResponse {
    contentType: string;
    data: Buffer;
}

export interface WaybackCache {
    add(day: string, month: string, year: string, url: string, res: WaybackResponse): void;
    
    tryGet(day: string, month: string, year: string, url: string): {
        found: boolean,
        value?: WaybackResponse
    }
}

/**
 * Ignores all cache requests.
 */
export class NullWaybackCache implements WaybackCache {
    add(_day: string, _month: string, _year: string, _url: string, _res: WaybackResponse) { }

    tryGet(_day: string, _month: string, _year: string, _url: string) {
        return { found: false };
    }
}

/**
 * Caches Wayback Machine responses via a `Map<K, V>`.
 */
export class MapWaybackCache implements WaybackCache {
    private cache: Map<string, WaybackResponse>;
    private totalSize: number;
    private maxSize: number;

    /**
     * Constructs a new Wayback Machine cache.
     * @param maxSize The maximum amount of bytes the cache may occupy.
     */
    constructor(maxSize: number) {
        this.cache = new Map<string, WaybackResponse>();
        this.maxSize = maxSize;
    }

    add(day: string, month: string, year: string, url: string, res: WaybackResponse) {
        const key = `${day}-${month}-${year}-${url}`;

        while (this.totalSize + res.data.byteLength > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            const firstValue = this.cache.get(firstKey);
            this.cache.delete(firstKey);
            this.totalSize -= firstValue.data.byteLength;
        }

        this.totalSize += res.data.byteLength;
        this.cache.set(key, res);
    }

    tryGet(day: string, month: string, year: string, url: string) {
        const key = `${day}-${month}-${year}-${url}`;
        const entry = this.cache.get(key);

        if (entry) {
            this.cache.delete(key);
            this.cache.set(key, entry);
            
            return { 
                found: true,
                value: entry
            };
        }

        return { found: false };
    }
}