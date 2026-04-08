import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDcUgW63U0Ii5DKkPEn5AjhrIi0LYNgDkA",
  authDomain: "section-fc.firebaseapp.com",
  projectId: "section-fc",
  storageBucket: "section-fc.firebasestorage.app",
  messagingSenderId: "849649943584",
  appId: "1:849649943584:web:f407e9c2bdcfd7c7d26845"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
