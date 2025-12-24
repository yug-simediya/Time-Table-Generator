
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General -> Your Apps -> SDK Setup
const firebaseConfig = {
  apiKey: "AIzaSyCAtwvsEonoaQS3a4vg8takbJplfL9B8fQ",
  authDomain: "education-ec30a.firebaseapp.com",
  projectId: "education-ec30a",
  storageBucket: "education-ec30a.appspot.com",
  messagingSenderId: "237963974500",
  appId: "1:237963974500:web:a0f0a17a75515c85ce0c71"
};

// Initialize Firebase
// We use a try-catch to prevent app crash if config is missing during demo
let app;
let auth;
let db;
let googleProvider;

try {
  // Check if config is placeholder
  if (firebaseConfig.apiKey === "AIzaSyDpnbe8-ASyAQyfhOqZGYVQizEm6kBPNSs") {
    console.warn("Firebase Config is missing. Google Sign-In will not work until you update services/firebaseConfig.ts");
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  }
} catch (e) {
  console.error("Firebase Initialization Failed:", e);
}

export { auth, db, googleProvider };
