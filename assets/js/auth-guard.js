import { auth, db } from "./firebase.js";
import { doc, getDoc } from 
"https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export async function cekRole(role) {
  if (!auth.currentUser) {
    location.href = "../login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));

  if (!snap.exists() || snap.data().role !== role) {
    location.href = "../login.html";
  }
}
