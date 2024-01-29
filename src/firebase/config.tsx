// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";


const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const FirebaseApp = initializeApp(firebaseConfig);
const FirebaseDatabase = getDatabase(FirebaseApp);
const FirebaseAppCheck = initializeAppCheck(FirebaseApp, {
    provider: new ReCaptchaEnterpriseProvider("6Lc7OF8pAAAAAH6SFYWw1m6lIrP_vuyYBPA_PT5x"),
    isTokenAutoRefreshEnabled: true
});

export { FirebaseApp, FirebaseDatabase, FirebaseAppCheck };
