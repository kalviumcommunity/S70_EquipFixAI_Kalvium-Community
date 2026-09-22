// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4FDDcbQv4NoXKKECZ_zkmm2uqtpOoANs",
  authDomain: "equipfixai-95850.firebaseapp.com",
  projectId: "equipfixai-95850",
  storageBucket: "equipfixai-95850.firebasestorage.app",
  messagingSenderId: "58099856313",
  appId: "1:58099856313:web:45d14c425b9d2da1303c68",
  measurementId: "G-6BT3JMME6F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this environment
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters: force account picker
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export { app, analytics };
export default app;
