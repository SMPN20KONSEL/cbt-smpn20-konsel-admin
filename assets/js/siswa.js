/* ===============================
   FIREBASE CORE
================================ */
import { app, db } from "./firebase.js";

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* ===============================
   SECONDARY AUTH (KHUSUS SISWA)
================================ */
const secondaryApp  = initializeApp(app.options, "secondary");
const secondaryAuth = getAuth(secondaryApp);

/* ===============================
   ELEMENT
================================ */
const list = document.getElementById("list");

/* ===============================
   LOADING HELPER
================================ */
function setLoading(el, state) {
  if (!el) return;
  el.disabled = state;
  el.innerHTML = state ? "⏳ Proses..." : el.dataset.label;
}

/* ===============================
   AKTIFKAN AKUN SISWA
================================ */
window.aktifkanAkun = async (nis, btn) => {
  setLoading(btn, true);

  try {
    const siswaRef = doc(db, "siswa", nis);
    const snap = await getDoc(siswaRef);

    if (!snap.exists()) throw "Data siswa tidak ditemukan";

    const siswa = snap.data();
    if (siswa.aktif) throw "Akun sudah aktif";

    // 1️⃣ BUAT AUTH
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      siswa.email,
      siswa.password
    );

    const uid = cred.user.uid;

    // 2️⃣ SIMPAN akun_siswa
    await setDoc(doc(db, "akun_siswa", uid), {
      uid,
      nis,
      email: siswa.email,
      createdAt: new Date()
    });

    // 3️⃣ UPDATE siswa
    await updateDoc(siswaRef, {
      aktif: true,
      deletedAt: null
    });

    await signOut(secondaryAuth);

    alert("Akun siswa berhasil diaktifkan ✅");
    load();

  } catch (err) {
    alert("Gagal aktivasi ❌\n" + err);
  }
};

/* ===============================
   NONAKTIFKAN AKUN SISWA
================================ */
window.nonaktifkanAkun = async (nis, btn) => {
  if (!confirm("Nonaktifkan akun siswa ini?")) return;

  setLoading(btn, true);

  try {
    const siswaRef = doc(db, "siswa", nis);
    const snap = await getDoc(siswaRef);

    if (!snap.exists()) throw "Data siswa tidak ditemukan";

    const siswa = snap.data();

    // 1️⃣ LOGIN AUTH SISWA
    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      siswa.email,
      siswa.password
    );

    // 2️⃣ HAPUS AUTH
    await deleteUser(cred.user);

    // 3️⃣ HAPUS akun_siswa
    const akunSnap = await getDocs(collection(db, "akun_siswa"));
    akunSnap.forEach(async d => {
      if (d.data().nis === nis) {
        await deleteDoc(d.ref);
      }
    });

    // 4️⃣ UPDATE siswa (SOFT DELETE)
    await updateDoc(siswaRef, {
      aktif: false,
      deletedAt: new Date()
    });

    await signOut(secondaryAuth);

    alert("Akun siswa dinonaktifkan 🗑️");
    load();

  } catch (err) {
    console.error(err);
    alert("Gagal nonaktif ❌\n" + err.message);
  }
};

/* ===============================
   IMPORT CSV SISWA (TETAP)
================================ */
window.importSiswa = async () => {
  const file = document.getElementById("fileImport").files[0];
  if (!file) return alert("Pilih file CSV");

  const text = await file.text();
  const rows = text.split("\n").filter(r => r && !r.startsWith("nis"));

  for (const row of rows) {
    const [nis, nama, kelas] = row.split(/[;,]/).map(x => x.trim());
    const namaDepan = nama.split(" ")[0].toLowerCase();

    await setDoc(doc(db, "siswa", nis), {
      nis,
      nama,
      kelas,
      email: `${namaDepan}${nis}@smp.belajar.id`,
      password: `${namaDepan.slice(0,2)}${nis}`,
      aktif: false,
      createdAt: new Date(),
      deletedAt: null
    });
  }

  load();
};

/* ===============================
   TAMPILKAN DATA SISWA
================================ */
function tampilkanSiswa(data) {
  list.innerHTML = "";

  data
    .filter(s => !s.deletedAt || s.aktif)
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .forEach((s, i) => {
      list.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${s.nama}</td>
          <td>${s.nis}</td>
          <td>${s.kelas}</td>
          <td>${s.email}</td>
          <td>${s.password}</td>
          <td>${s.aktif ? "✅ Aktif" : "❌ Nonaktif"}</td>
          <td>
            ${
              s.aktif
              ? `<button data-label="Nonaktifkan"
                    onclick="nonaktifkanAkun('${s.nis}', this)">
                    Nonaktifkan
                 </button>`
              : `<button data-label="Aktifkan"
                    onclick="aktifkanAkun('${s.nis}', this)">
                    Aktifkan
                 </button>`
            }
          </td>
        </tr>
      `;
    });
}

/* ===============================
   LOAD
================================ */
async function load() {
  const snap = await getDocs(collection(db, "siswa"));
  tampilkanSiswa(snap.docs.map(d => d.data()));
}

load();
