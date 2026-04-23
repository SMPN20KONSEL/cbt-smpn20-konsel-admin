import { auth, db } from "./firebase.js";
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, getDoc } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// 🔥 set role halaman (ubah sesuai halaman)
const roleHalaman = "guru";

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "../login.html";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      location.href = "../login.html";
      return;
    }

    const data = snap.data();

    // 🔒 cek role
    if (data.role !== roleHalaman) {
      alert("Akses ditolak");
      location.href = "../login.html";
      return;
    }

    // ✅ simpan biar bisa dipakai
    localStorage.setItem("uid", user.uid);
    localStorage.setItem("role", data.role);

  } catch (err) {
    console.error(err);
    location.href = "../login.html";
  }
});