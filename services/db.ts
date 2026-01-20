
import { db, isFirebaseConfigured } from './firebaseConfig';
import { doc, getDoc, setDoc, getDocs, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { CountrySentimentData, HistoricalPoint } from '../types';

// Collections
const LATEST_COLLECTION = 'latest_sentiments';
const ARCHIVE_COLLECTION = 'daily_archive';
const TEST_COLLECTION = '_connection_test_';

// In-Memory Fallback (Repository Pattern)
const memoryCache = new Map<string, CountrySentimentData>();

export const initDB = async () => {
    // console.debug("[DB] Initializing Database Service...");
    if (!isFirebaseConfigured) {
        console.warn("[DB] Firebase is NOT configured. Using In-Memory mode only.");
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
  } catch (e) {
      console.error(`[DB-Firestore] WRITE FAILED for ${data.countryName}:`, e);
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
  } catch (e) {
      console.error(`[DB-Firestore] READ ERROR for ${countryName}:`, e);
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
    } catch (e) {
        console.error(`[DB-Firestore] HISTORY ERROR for ${countryName}:`, e);
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
  } catch (e) {
      console.error("[DB-Firestore] Fetch ALL Error:", e);
      return Array.from(memoryCache.values());
  }
};
