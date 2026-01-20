import { fetchCountrySentiment } from './geminiService';
import { saveCountryData, getCountryData } from './db';

// STRICT RATE LIMITING FOR FREE TIER
// Limit: 5 Requests Per Minute (RPM) => 1 request every 12 seconds.
// We set delay to 15 seconds (4 RPM) to provide a safety buffer.
const SAFE_DELAY_MS = 15000; 

/**
 * Helper to fetch and save a single country
 * Returns 3 states: 'SUCCESS', 'SKIP', 'FATAL'
 */
export const ingestSpecificCountry = async (countryName: string): Promise<'SUCCESS' | 'SKIP' | 'FATAL'> => {
    try {
        const data = await fetchCountrySentiment(countryName);
        if (data) {
            await saveCountryData(data);
            return 'SUCCESS';
        }
        return 'SKIP';
    } catch (error: any) {
        if (error.message === "QUOTA_EXHAUSTED") {
            console.error(`[Scheduler] FATAL: Daily Quota or Rate Limit hit hard. Stopping queue.`);
            return 'FATAL';
        }
        console.error(`[Scheduler] Failed: ${countryName}`, error);
        return 'SKIP';
    }
};

type SyncStatus = 'IDLE' | 'ACTIVE' | 'ERROR' | 'COMPLETE';

interface SyncState {
    status: SyncStatus;
    remaining: number;
    current: string;
    errorMessage?: string;
}

/**
 * SyncManager
 * Manages the background processing queue to ensure we never exceed API limits
 * while ensuring data is refreshed once per day.
 */
class SyncManager {
    private queue: string[] = [];
    private isRunning = false;
    private timer: any = null;
    private onProgress: ((state: SyncState) => void) | null = null;
    private forceMode = false;
    
    // Tracks the timestamp of the start of the last API call
    private lastRequestTime = 0;

    /**
     * Start the daily sync process
     * @param countries List of countries to check
     * @param force If true, ignores DB freshness
     */
    public start(countries: string[], force = false) {
        this.forceMode = force;
        
        // Add only unique items to queue
        const newItems = countries.filter(c => !this.queue.includes(c));
        this.queue = [...this.queue, ...newItems];
        
        console.debug(`[SyncManager] Started. Queue size: ${this.queue.length} (Force: ${force})`);

        if (!this.isRunning) {
            this.processQueue();
        }
    }

    public setCallback(cb: (state: SyncState) => void) {
        this.onProgress = cb;
    }

    private emit(status: SyncStatus, remaining: number, current: string, errorMessage?: string) {
        if (this.onProgress) {
            this.onProgress({ status, remaining, current, errorMessage });
        }
    }

    /**
     * Move a country to the front of the line and process immediately
     */
    public prioritize(country: string) {
        // 1. Remove from current position
        this.queue = this.queue.filter(c => c !== country);
        
        // 2. Add to front
        this.queue.unshift(country);
        
        // 3. Interrupt existing timer to check if we can run NOW
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            this.processQueue();
        } else if (!this.isRunning) {
            this.processQueue();
        }
    }

    public stop(reason?: string) {
        this.queue = [];
        this.isRunning = false;
        if (this.timer) clearTimeout(this.timer);
        this.emit('ERROR', 0, '', reason || 'Stopped');
    }

    private async processQueue() {
        // Base Case: Queue Empty
        if (this.queue.length === 0) {
            this.isRunning = false;
            this.emit('COMPLETE', 0, 'Complete');
            return;
        }

        this.isRunning = true;
        const country = this.queue[0];
        
        this.emit('ACTIVE', this.queue.length, country);

        try {
            // --- OPTIMIZATION: Freshness Check ---
            let needsUpdate = true;
            
            if (!this.forceMode) {
                const existingData = await getCountryData(country);
                // If data exists and is less than 22 hours old, skip it.
                if (existingData && (Date.now() - existingData.lastUpdated < 1000 * 60 * 60 * 22)) {
                    needsUpdate = false;
                }
            }

            if (needsUpdate) {
                // --- CRITICAL: Strict Rate Limit Check ---
                const now = Date.now();
                const timeSinceLast = now - this.lastRequestTime;
                
                if (timeSinceLast < SAFE_DELAY_MS) {
                    const waitTime = SAFE_DELAY_MS - timeSinceLast + 100;
                    this.timer = setTimeout(() => this.processQueue(), waitTime);
                    return; 
                }

                this.lastRequestTime = Date.now();
                
                // Perform the expensive API call
                const result = await ingestSpecificCountry(country);
                
                if (result === 'FATAL') {
                    this.stop("Daily API Quota Exceeded (20 RPD Limit).");
                    return;
                }
                
                this.queue.shift();
                this.timer = setTimeout(() => this.processQueue(), SAFE_DELAY_MS);
                
            } else {
                this.queue.shift();
                this.timer = setTimeout(() => this.processQueue(), 200);
            }

        } catch (e) {
            console.error(`[SyncManager] Error processing ${country}`, e);
            this.queue.shift();
            this.timer = setTimeout(() => this.processQueue(), SAFE_DELAY_MS);
        }
    }
}

export const syncManager = new SyncManager();