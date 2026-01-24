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
   SECONDARY AUTH (KHUSUS GURU)
================================ */
const secondaryApp  = initializeApp(app.options, "secondary-guru");
const secondaryAuth = getAuth(secondaryApp);

/* ===============================
   ELEMENT
================================ */
const namaInput  = document.getElementById("nama");
const mapelInput = document.getElementById("mapel");
const list       = document.getElementById("list");

/* ===============================
   LOADING HELPER
================================ */
function setLoading(btn, state) {
  if (!btn) return;
  btn.disabled = state;
  btn.innerHTML = state ? "⏳ Proses..." : btn.dataset.label;
}

/* ===============================
   FORMAT MAPEL
================================ */
function formatMapel(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

/* ===============================
   GELAR MAP
================================ */
const GELAR_MAP = {
  spd: "S.Pd",
  spdi: "S.Pd.I",
  mpd: "M.Pd",
  gr: "S.Pd.Gr",
  dr: "Dr.",
  drs: "Drs.",
  h: "H.",
  hj: "Hj."
};

/* ===============================
   PARSE NAMA (PISAH GELAR)
================================ */
function parseNama(input) {
  const raw = input
    .replace(/\./g, "")     // hapus titik
    .replace(/,/g, "")      // hapus koma
    .toLowerCase()
    .trim();

  const parts = raw.split(/\s+/);

  const nama = [];
  const gelarSet = new Set();

  parts.forEach(p => {
    if (p === "spd") gelarSet.add("S.Pd.");
    else if (p === "gr") gelarSet.add("Gr");
    else nama.push(p);
  });

  const namaFix = nama
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    nama: namaFix,
    gelar: Array.from(gelarSet).join(", ")
  };
}


/* ===============================
   GENERATE EMAIL & PASSWORD
================================ */
function generateAkun(namaDasar) {
  const angka = Math.floor(10 + Math.random() * 90);
  const clean = namaDasar.toLowerCase().replace(/[^a-z]/g, "");

  return {
    email: `${clean}${angka}@smp.belajar.id`,
    password: clean.slice(0, 4) + angka
  };
}

/* ===============================
   TAMBAH GURU
================================ */
window.tambahGuru = async () => {
  if (!namaInput.value || !mapelInput.value)
    return alert("Lengkapi data guru");

  const parsed = parseNama(namaInput.value);
  const mapel  = formatMapel(mapelInput.value);
  const akun   = generateAkun(parsed.nama);

await setDoc(doc(db, "guru", akun.email), {
  nama: parsed.nama,      // TANPA GELAR
  gelar: parsed.gelar,    // SUDAH BERSIH
  mapel,
  email: akun.email,
  password: akun.password,
  aktif: false,
  createdAt: new Date(),
  deletedAt: null
});


  namaInput.value = "";
  mapelInput.value = "";

  loadGuru();
};

/* ===============================
   AKTIFKAN AKUN GURU
================================ */
window.aktifkanGuru = async (id, btn) => {
  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw "Data guru tidak ditemukan";

    const g = snap.data();
    if (g.aktif) throw "Akun sudah aktif";

    // 1️⃣ BUAT AUTH
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      g.email,
      g.password
    );

    // 2️⃣ SIMPAN USERS (ROLE GURU)
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      nama: g.nama,
      email: g.email,
      role: "guru",
      createdAt: new Date()
    });

    // 3️⃣ UPDATE GURU
    await updateDoc(ref, {
      aktif: true,
      deletedAt: null
    });

    await signOut(secondaryAuth);
    alert("Akun guru berhasil diaktifkan ✅");
    loadGuru();

  } catch (err) {
    alert("Gagal aktivasi ❌\n" + err);
  }
};

/* ===============================
   NONAKTIFKAN AKUN GURU
================================ */
window.nonaktifkanGuru = async (id, btn) => {
  if (!confirm("Nonaktifkan akun guru ini?")) return;

  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw "Data guru tidak ditemukan";

    const g = snap.data();

    // 1️⃣ LOGIN AUTH
    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      g.email,
      g.password
    );

    // 2️⃣ HAPUS AUTH
    await deleteUser(cred.user);

    // 3️⃣ HAPUS USERS
    const usersSnap = await getDocs(collection(db, "users"));
    for (const d of usersSnap.docs) {
      if (d.data().email === g.email) {
        await deleteDoc(d.ref);
      }
    }

    // 4️⃣ UPDATE GURU
    await updateDoc(ref, {
      aktif: false,
      deletedAt: new Date()
    });

    await signOut(secondaryAuth);
    alert("Akun guru dinonaktifkan 🗑️");
    loadGuru();

  } catch (err) {
    alert("Gagal nonaktif ❌\n" + err.message);
  }
};

/* ===============================
   LOAD DATA GURU
================================ */
async function loadGuru() {
  const snap = await getDocs(collection(db, "guru"));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  list.innerHTML = "";

  data
    .filter(g => !g.deletedAt || g.aktif)
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .forEach((g, i) => {
      list.innerHTML += `
  <tr>
    <td>${i + 1}</td>
    <td>${g.nama}${g.gelar ? ", " + g.gelar : ""}</td>
    <td>${g.mapel}</td>
    <td>${g.email}</td>
    <td>${g.password ?? "-"}</td>
    <td>
      ${g.aktif ? "✅ Aktif" : "❌ Nonaktif"}
    </td>
    <td>
      ${
        g.aktif
          ? `<button data-label="Nonaktifkan"
               onclick="nonaktifkanGuru('${g.id}', this)">
               Nonaktifkan
             </button>`
          : `<button data-label="Aktifkan"
               onclick="aktifkanGuru('${g.id}', this)">
               Aktifkan
             </button>`
      }
    </td>
  </tr>
`;

    });
}


loadGuru();
