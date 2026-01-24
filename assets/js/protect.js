import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";


onAuthStateChanged(auth, user => {
  if (!user) location.href = "/login.html";
});
