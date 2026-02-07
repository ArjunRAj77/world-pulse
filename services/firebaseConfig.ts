import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// console.debug("[FirebaseConfig] Loading configuration module...");



// Attempt to load from env, fallback to hardcoded strings
// Using process.env to be consistent with Gemini guidelines and avoid vite/client type issues
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN ;
const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL ;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID ;
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET ;
const messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ;
const appId = process.env.VITE_FIREBASE_APP_ID ;
const measurementId = process.env.VITE_FIREBASE_MEASUREMENT_ID ;

const firebaseConfig = {
  apiKey,
  authDomain,
  databaseURL,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId
};

// Validation
const hasValidKeys = !!(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    !firebaseConfig.apiKey.includes("YOUR_")
);

let app;
let dbInstance: Firestore | undefined = undefined;
let isConfigured = false;

if (hasValidKeys) {
    try {
        app = initializeApp(firebaseConfig);
        dbInstance = getFirestore(app);
        isConfigured = true;
    } catch (e) {
        console.error("[Firebase] Initialization FAILED:", e);
    }
} else {
    console.warn("[Firebase] Config Invalid or Missing. Database features will be disabled.");
}

export const db = dbInstance as Firestore; 
export const isFirebaseConfigured = isConfigured;