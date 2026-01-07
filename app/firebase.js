// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxt7HwkDz7t9lkTWqpAsMn3wVjLIq_Zn0",
  authDomain: "devoria-57dd4.firebaseapp.com",
  projectId: "devoria-57dd4",
  storageBucket: "devoria-57dd4.firebasestorage.app",
  messagingSenderId: "169178705677",
  appId: "1:169178705677:web:4cf6be7a74f39e5a17ca44"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth  = getAuth(app)

// Enable offline persistence