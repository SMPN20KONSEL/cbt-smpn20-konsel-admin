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
   LIST MAPEL SMP
================================ */
const daftarMapelSMP = [
  "Pendidikan Agama Islam",
  "Pendidikan Agama Kristen",
  "Pendidikan Agama Katolik",
  "Pendidikan Agama Hindu",
  "Pendidikan Agama Buddha",
  "Pendidikan Agama Konghucu",

  "PPKn",
  "Bahasa Indonesia",
  "Matematika",
  "IPA",
  "IPS",
  "Bahasa Inggris",

  "Seni Budaya",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Prakarya",
  "Informatika",

  "Bahasa Daerah",
  "Muatan Lokal"
];

/* ===============================
   INIT DROPDOWN MAPEL
================================ */
function initMapel() {
  mapelInput.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Pilih Mapel --";
  mapelInput.appendChild(defaultOpt);

  daftarMapelSMP.forEach(mapel => {
    const opt = document.createElement("option");
    opt.value = mapel;
    opt.textContent = mapel;
    mapelInput.appendChild(opt);
  });
}
/* ===============================
   LOADING HELPER
================================ */
function setLoading(btn, state) {
  if (!btn) return;

  const text = document.getElementById("textBtn");
  btn.disabled = state;

  text.innerHTML = state
    ? '<i class="fa fa-spinner fa-spin"></i> Proses...'
    : 'Tambah Guru';
}


/* ===============================
   PARSE NAMA (GELAR)
================================ */
function parseNama(input) {
  const raw = input
    .replace(/[.,]/g, "")
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

  return {
    nama: nama.map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    gelar: [...gelarSet].join(", ")
  };
}

/* ===============================
   GENERATE AKUN
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
   TOTAL GURU
================================ */
function updateTotalGuru(data) {
  document.getElementById("totalGuru").innerText =
    "Total: " + data.length + " guru";
}

/* ===============================
   TAMBAH GURU
================================ */
window.tambahGuru = async () => {
  if (!namaInput.value || !mapelInput.value)
    return alert("Lengkapi data guru");

  const parsed = parseNama(namaInput.value);
  const mapel = mapelInput.value;
  const akun   = generateAkun(parsed.nama);

  await setDoc(doc(db, "guru", akun.email), {
    nama: parsed.nama,
    gelar: parsed.gelar,
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
   AKTIFKAN GURU
================================ */
window.aktifkanGuru = async (id, btn) => {
  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw "Data guru tidak ditemukan";
    const g = snap.data();

    if (g.aktif) throw "Akun sudah aktif";

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      g.email,
      g.password
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      nama: g.nama,
      email: g.email,
      role: "guru",
      createdAt: new Date()
    });

    await updateDoc(ref, { aktif: true, deletedAt: null });

    await signOut(secondaryAuth);
    alert("Akun guru berhasil diaktifkan ✅");

    loadGuru();

  } catch (err) {
    alert("Gagal aktivasi ❌\n" + err);
  }
};

/* ===============================
   NONAKTIFKAN GURU
================================ */
window.nonaktifkanGuru = async (id, btn) => {
  if (!confirm("Nonaktifkan akun guru ini?")) return;

  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw "Data guru tidak ditemukan";
    const g = snap.data();

    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      g.email,
      g.password
    );

    await deleteUser(cred.user);

    const usersSnap = await getDocs(collection(db, "users"));
    for (const d of usersSnap.docs) {
      if (d.data().email === g.email) {
        await deleteDoc(d.ref);
      }
    }

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
   LOAD DATA
================================ */
async function loadGuru() {
  const snap = await getDocs(collection(db, "guru"));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 🔥 FILTER DULU
  const filtered = data
    .filter(g => !g.deletedAt || g.aktif)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  // 🔥 UPDATE TOTAL (BENAR)
  updateTotalGuru(filtered);

  list.innerHTML = "";

  filtered.forEach((g, i) => {
    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${g.nama}${g.gelar ? ", " + g.gelar : ""}</td>
        <td>${g.mapel}</td>
        <td>${g.email}</td>
        <td>${g.password ?? "-"}</td>
        <td>${g.aktif ? "✅ Aktif" : "❌ Nonaktif"}</td>
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

/* ===============================
   INIT
================================ */
initMapel();
loadGuru();