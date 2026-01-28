
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Using @firebase/auth directly to resolve export member errors in some environments
import { getAuth } from "@firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAXjMbSmR4d-u3XhpLsS9F7_aFjmMA8BTI",
  authDomain: "shopfinder-shop.firebaseapp.com",
  projectId: "shopfinder-shop",
  storageBucket: "shopfinder-shop.firebasestorage.app",
  messagingSenderId: "495176954158",
  appId: "1:495176954158:web:fa45e57eda7513c71b0abf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
