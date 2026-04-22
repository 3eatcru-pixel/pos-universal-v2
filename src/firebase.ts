import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore
async function testConnection() {
  try {
    // We try to fetch a dummy doc to verify connectivity
    await getDocFromServer(doc(db, '_internal_', 'connectivity_test'));
    console.log("Firebase connected successfully.");
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'failed-precondition') {
      console.error("Please check your Firebase configuration or network status.", error);
    } else if (error?.code !== 'permission-denied') {
      // Permission denied is actually a good sign - it means we talked to the server
      console.warn("Firebase connectivity test returned expected isolation status:", error?.code);
    }
  }
}

testConnection();
