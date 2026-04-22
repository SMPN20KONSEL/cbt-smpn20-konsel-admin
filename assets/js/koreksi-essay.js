import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= SESSION =================
// ================= SESSION =================
const guruUid = localStorage.getItem("uid");
const role = localStorage.getItem("role");

if (!guruUid || role !== "guru") {
  alert("Session habis / akses ditolak");
  location.href = "../login.html";
}

// ================= ELEMENT =================
const mapelEl   = document.getElementById("mapel");
const kelasEl   = document.getElementById("kelas");
const tabel     = document.getElementById("tabel");
const btnFilter = document.getElementById("filter");

// ================= LOAD FILTER =================
async function loadFilter() {
  const q = query(
    collection(db, "jawaban_siswa"),
    where("guruId", "==", guruUid)
  );

  const snap = await getDocs(q);

  const mapelSet = new Set();
  const kelasSet = new Set();

  snap.forEach(doc => {
    const d = doc.data();
    if (d.mapel) mapelSet.add(d.mapel);
    if (d.kelas) kelasSet.add(d.kelas);
  });

  mapelEl.innerHTML = `<option value="">-- Pilih Mapel --</option>`;
  kelasEl.innerHTML = `<option value="">-- Pilih Kelas --</option>`;

  mapelSet.forEach(m =>
    mapelEl.innerHTML += `<option value="${m}">${m}</option>`
  );

  kelasSet.forEach(k =>
    kelasEl.innerHTML += `<option value="${k}">${k}</option>`
  );
}

// ================= TAMPILKAN SEMUA =================
async function tampilkanSemua() {
  tabel.innerHTML = "";

  const q = query(
    collection(db, "jawaban_siswa"),
    where("guruId", "==", guruUid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    tabel.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center">
          Tidak ada data
        </td>
      </tr>
    `;
    return;
  }

  snap.forEach(docu => {
    const d = docu.data();

    const status = d.statusNilai === "sudah_dinilai"
      ? `<span class="badge sudah">Sudah</span>`
      : `<span class="badge belum">Belum</span>`;

    tabel.innerHTML += `
<tr>
  <td>${d.namaSiswa}</td>
  <td>${d.kelas}</td>
  <td>${d.mapel}</td>
  <td>${status}</td>
  <td style="display:flex; gap:6px">

    <button onclick="lihatJawaban('${docu.id}')"
      style="background:#3498db;color:white;border:none;padding:6px 10px;border-radius:6px">
      👁 Lihat
    </button>

    <button onclick="koreksi('${docu.id}')"
      style="background:#2ecc71;color:white;border:none;padding:6px 10px;border-radius:6px">
      ✏️ Koreksi
    </button>

  </td>
</tr>
`;
  });
}

// ================= FILTER DATA =================
btnFilter.onclick = async () => {
  tabel.innerHTML = "";

  const mapel = mapelEl.value;
  const kelas = kelasEl.value;

  if (!mapel || !kelas) {
    alert("Pilih mapel dan kelas");
    return;
  }

  const q = query(
    collection(db, "jawaban_siswa"),
    where("guruId", "==", guruUid),
    where("mapel", "==", mapel),
    where("kelas", "==", kelas)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    tabel.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center">
          Tidak ada data
        </td>
      </tr>
    `;
    return;
  }

  snap.forEach(docu => {
    const d = docu.data();

    const status = d.statusNilai === "sudah_dinilai"
      ? `<span class="badge sudah">Sudah</span>`
      : `<span class="badge belum">Belum</span>`;

    tabel.innerHTML += `
<tr>
  <td>${d.namaSiswa}</td>
  <td>${d.kelas}</td>
  <td>${d.mapel}</td>
  <td>${status}</td>
  <td style="display:flex; gap:6px">

    <button onclick="lihatJawaban('${docu.id}')"
      style="background:#3498db;color:white;border:none;padding:6px 10px;border-radius:6px">
      👁 Lihat
    </button>

    <button onclick="koreksi('${docu.id}')"
      style="background:#2ecc71;color:white;border:none;padding:6px 10px;border-radius:6px">
      ✏️ Koreksi
    </button>

  </td>
</tr>
`;
  });
};

// ================= AUTO LOAD =================
window.addEventListener("load", async () => {
  await loadFilter();

  const params = new URLSearchParams(window.location.search);
  const mapel  = params.get("mapel");
  const kelas  = params.get("kelas");

  if (mapel && kelas) {
    mapelEl.value = mapel;
    kelasEl.value = kelas;
    btnFilter.click();
  } else {
    tampilkanSemua();
  }
});

// ================= NAVIGASI =================
window.lihatJawaban = function(docId) {
  window.location.href = `lihat-jawaban.html?docId=${docId}`;
};

window.koreksi = function(docId) {
  window.location.href = `nilai-essay.html?docId=${docId}`;
};