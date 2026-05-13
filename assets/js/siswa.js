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
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

  if (!el.dataset.label) {
    el.dataset.label = el.innerText;
  }

  el.disabled = state;
  el.innerHTML = state ? "⏳ Proses..." : el.dataset.label;
}

function updateTotalSiswa(data) {
  document.getElementById("totalSiswa").innerText =
    "Total: " + data.length + " siswa";
}

function showNotif(text, color = "#16a34a") {

  const notif = document.createElement("div");

  notif.className = "notif";
  notif.innerHTML = text;

  notif.style.background = color;

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.remove();
  }, 2000);
}

function confirmCustom(text) {

  const bg = document.createElement("div");
  bg.className = "confirm-bg";

  bg.innerHTML = `
    <div class="confirm-box">

      <div class="confirm-text">
        ${text}
      </div>

      <div class="confirm-actions">

        <button type="button" class="btn-batal">
          Batal
        </button>

        <button type="button" class="btn-hapus-confirm">
          Hapus
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(bg);

  return new Promise(resolve => {

    bg.querySelector(".btn-batal").onclick = () => {
      bg.remove();
      resolve(false);
    };

    bg.querySelector(".btn-hapus-confirm").onclick = () => {
      bg.remove();
      resolve(true);
    };

  });
}

/* ===============================
   UPDATE UI TANPA RELOAD
================================ */
function updateUI(nis, aktif) {

  const row = document.getElementById(`row-${nis}`);
  if (!row) return;

  const statusCell = row.querySelector(".status");
  const aksiCell   = row.querySelector(".aksi");

  // ===============================
  // UPDATE STATUS
  // ===============================
  statusCell.innerHTML = aktif
    ? `<span class="badge aktif">Aktif</span>`
    : `<span class="badge nonaktif">Nonaktif</span>`;

  // ===============================
  // UPDATE TOMBOL
  // ===============================
  aksiCell.innerHTML = `
    ${
      aktif
      ? `<button class="btn btn-nonaktif"
            data-label="Nonaktifkan"
            onclick="nonaktifkanAkun('${nis}', this)">
            Nonaktifkan
         </button>`
      : `<button class="btn btn-aktif"
            data-label="Aktifkan"
            onclick="aktifkanAkun('${nis}', this)">
            Aktifkan
         </button>`
    }

    <button class="btn btn-hapus"
      data-label="Hapus"
      onclick="hapusSiswa('${nis}', this)">
      Hapus
    </button>
  `;
}

/* ===============================
   AKTIFKAN AKUN SISWA
================================ */
window.aktifkanAkun = async (nis, btn) => {

  setLoading(btn, true);

  try {

    const siswaRef = doc(db, "siswa", nis);
    const snap = await getDoc(siswaRef);

    if (!snap.exists()) {
      throw new Error("Data siswa tidak ditemukan");
    }

    const siswa = snap.data();

    let uid = "";

    // ===============================
    // LOGIN AUTH YANG SUDAH ADA
    // ===============================
    try {

      const login = await signInWithEmailAndPassword(
        secondaryAuth,
        siswa.email,
        siswa.password
      );

      uid = login.user.uid;

    } catch (err) {

      // kalau akun auth belum ada
      if (err.code === "auth/user-not-found") {

        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          siswa.email,
          siswa.password
        );

        uid = cred.user.uid;

      } else {
        throw err;
      }
    }

    // ===============================
    // SIMPAN akun_siswa
    // ===============================
    await setDoc(doc(db, "akun_siswa", uid), {
      uid,
      nis,
      email: siswa.email,
      aktif: true,
      createdAt: new Date()
    });

    // ===============================
    // UPDATE STATUS
    // ===============================
    await updateDoc(siswaRef, {
      aktif: true,
      uid: uid
    });

    await signOut(secondaryAuth);

    showNotif(
      "✅ Akun siswa berhasil diaktifkan"
    );

    updateUI(nis, true);

  } catch (err) {

    console.error(err);

    showNotif(
      "❌ Gagal mengaktifkan akun",
      "#dc2626"
    );

  } finally {

    setLoading(btn, false);

  }
};


/* ===============================
   NONAKTIFKAN AKUN SISWA
================================ */
window.nonaktifkanAkun = async (nis, btn) => {

  setLoading(btn, true);

  try {

    const siswaRef = doc(db, "siswa", nis);

    const snap = await getDoc(siswaRef);

    if (!snap.exists()) {
      throw new Error("Data siswa tidak ditemukan");
    }

    // ===============================
    // UPDATE STATUS SAJA
    // ===============================
    await updateDoc(siswaRef, {
      aktif: false
    });

    // NOTIFIKASI
    showNotif(
      "⛔ Akun siswa berhasil dinonaktifkan",
      "#dc2626"
    );

    // UPDATE UI
    updateUI(nis, false);

  } catch (err) {

    console.error(err);

    showNotif(
      "❌ Gagal menonaktifkan akun",
      "#dc2626"
    );

  } finally {

    setLoading(btn, false);

  }
};

/* ===============================
   IMPORT CSV SISWA
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
      createdAt: new Date()
    });
  }

  load();
};
const container = document.getElementById("list");

/* ===============================
   TAMPILKAN PER KELAS
================================ */
function tampilkanSiswa(data) {
  container.innerHTML = "";

  const sorted = data.sort((a, b) => a.nama.localeCompare(b.nama));

  updateTotalSiswa(sorted);

  // GROUP BY KELAS
  const grouped = {};

  sorted.forEach(s => {
    if (!grouped[s.kelas]) grouped[s.kelas] = [];
    grouped[s.kelas].push(s);
  });

  // RENDER SETIAP KELAS
  Object.keys(grouped).sort().forEach(kelas => {
    const siswaKelas = grouped[kelas];

    let rows = "";

    siswaKelas.forEach((s, i) => {
      rows += `
  <tr id="row-${s.nis}">
    
    <td data-label="No">${i + 1}</td>

    <td data-label="Nama">${s.nama}</td>

    <td data-label="NIS">${s.nis}</td>

    <td data-label="Kelas">${s.kelas}</td>

    <td data-label="Email">${s.email}</td>

    <td data-label="Password">${s.password}</td>

    <td class="status" data-label="Status">
      ${
        s.aktif
          ? `<span class="badge aktif">Aktif</span>`
          : `<span class="badge nonaktif">Nonaktif</span>`
      }
    </td>

    <td class="aksi" data-label="Aksi">

      ${
  s.aktif
  ? `<button class="btn btn-nonaktif"
        data-label="Nonaktifkan"
        onclick="nonaktifkanAkun('${s.nis}', this)">
        Nonaktifkan
     </button>`
  : `<button class="btn btn-aktif"
        data-label="Aktifkan"
        onclick="aktifkanAkun('${s.nis}', this)">
        Aktifkan
     </button>`
}

<button class="btn btn-hapus"
  data-label="Hapus"
  onclick="hapusSiswa('${s.nis}', this)">
  Hapus
</button>

    </td>

  </tr>
`;
    });

    container.innerHTML += `
      <div class="kelas-card" data-kelas="${kelas}">

<div class="kelas-header">

  <div>
    <div class="kelas-title">
      Kelas ${kelas}
    </div>

    <div class="kelas-total">
      ${siswaKelas.length} siswa
    </div>
  </div>

  <button
    class="btn btn-download"
    onclick="exportExcelKelas('${kelas}')">

    <i class="fa-solid fa-download"></i>
    Unduh Excel

  </button>

</div>

        <table class="tabel-kelas">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>NIS</th>
              <th>Kelas</th>
              <th>Email</th>
              <th>PW</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

      </div>
    `;
  });
}

/* ===============================
   EXPORT EXCEL PER KELAS
================================ */
window.exportExcelKelas = function(kelas) {

  const table = document.querySelector(
    `[data-kelas="${kelas}"] table`
  );

  if (!table) {
    return alert("Tabel tidak ditemukan");
  }

  // ambil semua row tbody
  const rows = table.querySelectorAll("tbody tr");

  const data = [];

  rows.forEach((row, index) => {

    const td = row.querySelectorAll("td");

    data.push({
      No: index + 1,
      Nama: td[1]?.innerText || "",
      Kelas: td[3]?.innerText || "",
      Username: td[4]?.innerText || "", // email
      Password: td[5]?.innerText || ""
    });

  });

  // buat workbook
  const wb = XLSX.utils.book_new();

  // convert json -> sheet
  const ws = XLSX.utils.json_to_sheet(data);

  // auto width
  ws["!cols"] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 12 },
    { wch: 35 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    `Kelas ${kelas}`
  );

  // download
  XLSX.writeFile(
    wb,
    `Data_Siswa_Kelas_${kelas}.xlsx`
  );

  showNotif(
    `📥 Excel kelas ${kelas} berhasil diunduh`,
    "#2563eb"
  );
};

/* ===============================
   LOAD DATA
================================ */
async function load() {
  const snap = await getDocs(collection(db, "siswa"));
  const data = snap.docs.map(d => d.data());

  tampilkanSiswa(data);
}

load();

window.hapusSiswa = async (nis, btn) => {

  const lanjut = await confirmCustom(
    "🗑️ Hapus siswa ini?<br><small>Data tidak bisa dikembalikan</small>"
  );

  if (!lanjut) return;

  setLoading(btn, true);

  try {
    const siswaRef = doc(db, "siswa", nis);
    const snap = await getDoc(siswaRef);

    if (!snap.exists()) throw new Error("Data tidak ditemukan");

    const q = query(collection(db, "akun_siswa"), where("nis", "==", nis));
    const akunSnap = await getDocs(q);

    for (const d of akunSnap.docs) {
      await deleteDoc(d.ref);
    }

    await deleteDoc(siswaRef);

    const row = document.getElementById(`row-${nis}`);
    if (row) row.remove();

    const totalRow = document.querySelectorAll(".tabel-kelas tbody tr").length;

    document.getElementById("totalSiswa").innerText =
      "Total: " + totalRow + " siswa";

    showNotif("✅ Siswa berhasil dihapus", "#dc2626");

  } catch (err) {
    showNotif("❌ Gagal menghapus siswa", "#dc2626");
  } finally {
    setLoading(btn, false);
  }
};