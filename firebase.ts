
import { initializeApp } from "firebase/app";

// Standard Firebase configuration object. 
// For Firebase App Hosting, these values are typically provided in the project settings.
const firebaseConfig = {
  apiKey: "AIzaSy-PLACEHOLDER-KEY",
  authDomain: "shopfinder-app.firebaseapp.com",
  projectId: "shopfinder-app",
  storageBucket: "shopfinder-app.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
