
import { fetchBatchCountrySentiment } from './geminiService';
import { saveCountryData, getCountryData } from './db';

// STRICT RATE LIMITING FOR FREE TIER
// Limit: 5 Requests Per Minute (RPM) => 1 request every 12 seconds.
// We set delay to 15 seconds (4 RPM) to provide a safety buffer.
const SAFE_DELAY_MS = 15000; 
const BATCH_SIZE = 5; // Optimized to 5: Safe balance between speed and output token limits

/**
 * Helper to fetch and save a batch of countries
 * Returns 3 states: 'SUCCESS', 'SKIP', 'FATAL'
 */
export const ingestBatch = async (countries: string[]): Promise<'SUCCESS' | 'SKIP' | 'FATAL'> => {
    try {
        const results = await fetchBatchCountrySentiment(countries);
        if (results && results.length > 0) {
            for (const data of results) {
                await saveCountryData(data);
            }
            return 'SUCCESS';
        }
        return 'SKIP';
    } catch (error: any) {
        if (error.message === "QUOTA_EXHAUSTED") {
            // Log fatal error as it stops functionality, but don't leak data
            console.error(`[Scheduler] FATAL: Quota/Rate Limit hit. Stopping.`);
            return 'FATAL';
        }
        // Suppress batch errors to avoid log spam
        // console.error(`[Scheduler] Failed Batch: ${countries.join(', ')}`, error);
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

    public get isSyncing() {
        return this.isRunning;
    }

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
        
        // console.debug(`[SyncManager] Started. Queue size: ${this.queue.length} (Force: ${force})`);

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
        
        // Take a batch of countries
        const batch = this.queue.slice(0, BATCH_SIZE);
        const batchNames = batch.join(", ");
        
        this.emit('ACTIVE', this.queue.length, batchNames);

        try {
            // --- OPTIMIZATION: Freshness Check ---
            let countriesToFetch: string[] = [];
            
            if (this.forceMode) {
                countriesToFetch = batch;
            } else {
                for (const country of batch) {
                    const existingData = await getCountryData(country);
                    // If data missing or old (>22h), add to fetch list
                    if (!existingData || (Date.now() - existingData.lastUpdated > 1000 * 60 * 60 * 22)) {
                        countriesToFetch.push(country);
                    }
                }
            }

            if (countriesToFetch.length > 0) {
                // --- CRITICAL: Strict Rate Limit Check ---
                const now = Date.now();
                const timeSinceLast = now - this.lastRequestTime;
                
                if (timeSinceLast < SAFE_DELAY_MS) {
                    const waitTime = SAFE_DELAY_MS - timeSinceLast + 100;
                    this.timer = setTimeout(() => this.processQueue(), waitTime);
                    return; 
                }

                this.lastRequestTime = Date.now();
                
                // Perform the expensive API call for the filtered batch
                const result = await ingestBatch(countriesToFetch);
                
                if (result === 'FATAL') {
                    this.stop("Daily API Quota Exceeded (20 RPD Limit).");
                    return;
                }
                
                // Remove processed batch from queue
                this.queue.splice(0, BATCH_SIZE);
                this.timer = setTimeout(() => this.processQueue(), SAFE_DELAY_MS);
                
            } else {
                // All items in batch were fresh, skip immediately
                this.queue.splice(0, BATCH_SIZE);
                this.timer = setTimeout(() => this.processQueue(), 200);
            }

        } catch (e) {
            // console.error(`[SyncManager] Error processing batch ${batchNames}`, e);
            this.queue.splice(0, BATCH_SIZE); // Skip failed batch to prevent loop
            this.timer = setTimeout(() => this.processQueue(), SAFE_DELAY_MS);
        }
    }
}

export const syncManager = new SyncManager();

/**
 * Daily Scheduler
 * Triggers the SyncManager at a specific time of day (e.g. 08:00 AM)
 */
export const initDailyScheduler = (targetHour: number, getCountriesCallback: () => string[]) => {
    // Check local storage to see if we already ran for today
    const STORAGE_KEY = 'geopulse_last_daily_sync';
    const lastRun = localStorage.getItem(STORAGE_KEY);
    const todayStr = new Date().toDateString();

    const runJob = () => {
        const countries = getCountriesCallback();
        if (countries.length > 0) {
            // console.debug(`[DailyScheduler] Triggering scheduled update for ${countries.length} countries.`);
            syncManager.start(countries, false); // false = respect freshness (don't force if already updated manually)
            localStorage.setItem(STORAGE_KEY, todayStr);
        }
    };

    const scheduleNext = () => {
        const now = new Date();
        const nextRun = new Date();
        
        // Set target time
        nextRun.setHours(targetHour, 0, 0, 0);

        // If target time has passed today, schedule for tomorrow
        if (now.getTime() >= nextRun.getTime()) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        const delay = nextRun.getTime() - now.getTime();
        // console.debug(`[DailyScheduler] Next update scheduled in ${Math.round(delay / 1000 / 60)} minutes.`);

        setTimeout(() => {
            runJob();
            scheduleNext(); // Recurse for the next day
        }, delay);
    };

    // Initial check on boot: If we haven't run today and it's past target time, run now.
    // Otherwise, just schedule the future job.
    const now = new Date();
    const targetToday = new Date();
    targetToday.setHours(targetHour, 0, 0, 0);

    if (lastRun !== todayStr && now.getTime() >= targetToday.getTime()) {
        runJob();
    }
    
    // Always start the timer for the next occurrence
    scheduleNext();
};
