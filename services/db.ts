
import { db, isFirebaseConfigured } from './firebaseConfig';
import { doc, getDoc, setDoc, getDocs, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { CountrySentimentData, HistoricalPoint, ConflictZone } from '../types';

// Collections
const LATEST_COLLECTION = 'latest_sentiments';
const ARCHIVE_COLLECTION = 'daily_archive';
const CONFLICTS_COLLECTION = 'active_conflicts';
const TEST_COLLECTION = '_connection_test_';

// In-Memory Fallback (Repository Pattern)
const memoryCache = new Map<string, CountrySentimentData>();

export const initDB = async () => {
    if (!isFirebaseConfigured) {
        // Warn only once for configuration issues
        // console.warn("[DB] Firebase is NOT configured. Using In-Memory mode only.");
        return false;
    }
    return true;
};

// NEW: Test Function returns status for UI handling
export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured) {
        return { success: false, error: 'not-configured' };
    }
    
    try {
        const testRef = doc(db, TEST_COLLECTION, "connectivity_check");
        await setDoc(testRef, {
            status: "SUCCESS",
            timestamp: new Date().toISOString(),
            agent: navigator.userAgent
        });
        return { success: true };
    } catch (e: any) {
        // Return the error code so the UI can show the specific "Rules" help screen
        return { success: false, error: e.code || e.message };
    }
};

export const saveCountryData = async (data: CountrySentimentData) => {
  memoryCache.set(data.countryName, data);

  if (!isFirebaseConfigured) {
      return;
  }

  try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const archiveId = `${data.countryName}_${today}`;
      
      const latestRef = doc(db, LATEST_COLLECTION, data.countryName);
      await setDoc(latestRef, data);

      const archiveRef = doc(db, ARCHIVE_COLLECTION, archiveId);
      await setDoc(archiveRef, {
          ...data,
          archivedDate: today
      });
  } catch (e: any) {
      // Suppress offline/network errors for background saves
      if (e.code === 'unavailable' || (e.message && e.message.includes('offline'))) {
          // console.debug(`[DB-Firestore] Offline - write queued/skipped for ${data.countryName}`);
          return;
      }
      // console.error(`[DB-Firestore] WRITE FAILED for ${data.countryName}:`, e);
  }
};

export const getCountryData = async (countryName: string): Promise<CountrySentimentData | undefined> => {
  if (memoryCache.has(countryName)) {
      return memoryCache.get(countryName);
  }

  if (!isFirebaseConfigured) {
      return undefined;
  }

  try {
      const docRef = doc(db, LATEST_COLLECTION, countryName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
          const data = docSnap.data() as CountrySentimentData;
          memoryCache.set(countryName, data);
          return data;
      } else {
          return undefined;
      }
  } catch (e: any) {
      // Gracefully handle offline status
      if (e.code === 'unavailable' || (e.message && e.message.includes('offline'))) {
           // console.warn(`[DB-Firestore] Offline mode - skipping cache check for ${countryName}`);
           return undefined;
      }
      // console.error(`[DB-Firestore] READ ERROR for ${countryName}:`, e);
      return undefined;
  }
};

export const getCountryHistory = async (countryName: string): Promise<HistoricalPoint[]> => {
    if (!isFirebaseConfigured) return [];

    try {
        // We query by countryName. 
        // NOTE: Ideally we would use orderBy('lastUpdated'), but that requires a composite index.
        // For simplicity in this beta, we fetch all for country (usually small < 365) and sort in JS.
        const q = query(
            collection(db, ARCHIVE_COLLECTION),
            where("countryName", "==", countryName)
        );

        const querySnapshot = await getDocs(q);
        const history: HistoricalPoint[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.sentimentScore !== undefined && data.lastUpdated) {
                history.push({
                    date: data.archivedDate || new Date(data.lastUpdated).toISOString().split('T')[0],
                    score: data.sentimentScore,
                    timestamp: data.lastUpdated
                });
            }
        });

        // Sort ascending by time
        return history.sort((a, b) => a.timestamp - b.timestamp);
    } catch (e: any) {
        if (e.code === 'unavailable' || (e.message && e.message.includes('offline'))) {
            return [];
        }
        // console.error(`[DB-Firestore] HISTORY ERROR for ${countryName}:`, e);
        return [];
    }
};

export const getAllCountryData = async (): Promise<CountrySentimentData[]> => {
  if (memoryCache.size > 0 && !isFirebaseConfigured) {
      return Array.from(memoryCache.values());
  }

  if (!isFirebaseConfigured) return [];

  try {
      const querySnapshot = await getDocs(collection(db, LATEST_COLLECTION));
      const data: CountrySentimentData[] = [];
      querySnapshot.forEach((doc) => {
          const item = doc.data() as CountrySentimentData;
          data.push(item);
          memoryCache.set(item.countryName, item);
      });
      return data;
  } catch (e: any) {
      if (e.code === 'unavailable' || (e.message && e.message.includes('offline'))) {
          // Fallback to memory cache if offline
          return Array.from(memoryCache.values());
      }
      // console.error("[DB-Firestore] Fetch ALL Error:", e);
      return Array.from(memoryCache.values());
  }
};

// --- CONFLICT DATA METHODS ---

export const getActiveConflicts = async (): Promise<ConflictZone[]> => {
    if (!isFirebaseConfigured) {
        return [];
    }
    
    try {
        const docRef = doc(db, CONFLICTS_COLLECTION, 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Backward compatibility check for old array of strings
            const items = data.conflicts || data.countries || [];
            
            // Normalize string[] to ConflictZone[] if old data exists
            if (items.length > 0 && typeof items[0] === 'string') {
                return items.map((c: string) => ({ countryName: c, summary: "Active conflict reported." }));
            }
            return items;
        }
        return [];
    } catch (e) {
        // console.error("[DB] Failed to get conflicts", e);
        return [];
    }
};

export const saveActiveConflicts = async (conflicts: ConflictZone[]) => {
    if (!isFirebaseConfigured) return;
    
    try {
        const docRef = doc(db, CONFLICTS_COLLECTION, 'current');
        // setDoc replaces the content by default (unless merge: true is passed)
        // This ensures old/finished conflicts are removed.
        await setDoc(docRef, {
            conflicts,
            lastUpdated: Date.now()
        });
        // console.log(`[DB] Active conflicts overwritten. Count: ${conflicts.length}`);
    } catch (e) {
        // console.error("[DB] Failed to save conflicts", e);
    }
};
