import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  const el = document.getElementById("nama-guru");
  if (!el) return;

  el.textContent = "Memuat...";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.href = "../login.html";
      return;
    }

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        el.textContent = data.nama || "Guru";
      } else {
        el.textContent = user.email;
      }

    } catch (err) {
      console.error(err);
      el.textContent = user.email;
    }
  });

});