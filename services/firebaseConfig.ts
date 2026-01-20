import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// console.debug("[FirebaseConfig] Loading configuration module...");

// Hardcoded fallbacks to ensure the app works in environments where .env might not load immediately
const FALLBACK_CONFIG = {
    apiKey: "AIzaSyDWfEQlTdYK_8vu8oR8lSmVc1BSGCHbkk8",
    authDomain: "geopulse-e8daa.firebaseapp.com",
    databaseURL: "https://geopulse-e8daa-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "geopulse-e8daa",
    storageBucket: "geopulse-e8daa.firebasestorage.app",
    messagingSenderId: "178606307002",
    appId: "1:178606307002:web:34704e714348011f99b483",
    measurementId: "G-0VQ0VD1WVQ"
};

// Attempt to load from env, fallback to hardcoded strings
// Using process.env to be consistent with Gemini guidelines and avoid vite/client type issues
const apiKey = process.env.VITE_FIREBASE_API_KEY || FALLBACK_CONFIG.apiKey;
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK_CONFIG.authDomain;
const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL || FALLBACK_CONFIG.databaseURL;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || FALLBACK_CONFIG.projectId;
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || FALLBACK_CONFIG.storageBucket;
const messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FALLBACK_CONFIG.messagingSenderId;
const appId = process.env.VITE_FIREBASE_APP_ID || FALLBACK_CONFIG.appId;
const measurementId = process.env.VITE_FIREBASE_MEASUREMENT_ID || FALLBACK_CONFIG.measurementId;

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