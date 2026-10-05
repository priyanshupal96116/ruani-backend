import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {// For Firebase JS SDK v7.20.0 and later, measurementId is optional
  apiKey: "AIzaSyD4JhkIFB7T4oOWvZteSLzCdAZZYG1_rVk",
  authDomain: "gym-ai-manager.firebaseapp.com",
  projectId: "gym-ai-manager",
  storageBucket: "gym-ai-manager.firebasestorage.app",
  messagingSenderId: "177339795101",
  appId: "1:177339795101:web:bada141a8dff91024ff674",
  measurementId: "G-DRCJ67KYZH"

  
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);