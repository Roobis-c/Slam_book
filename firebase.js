import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5WARoyQtccLXoNrdtqe0lcK4dHaBKXaM",
  authDomain: "slam-book-cd4b5.firebaseapp.com",
  projectId: "slam-book-cd4b5",
  storageBucket: "slam-book-cd4b5.firebasestorage.app",
  messagingSenderId: "257179480470",
  appId: "1:257179480470:web:944746f444f19c4d1d2db7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
