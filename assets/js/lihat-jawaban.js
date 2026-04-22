import { db } from "./firebase.js";
import { doc, getDoc } from 
"https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= PARAM =================
const params = new URLSearchParams(window.location.search);
const docId = params.get("docId");

if (!docId) {
  alert("ID tidak valid");
  history.back();
}

// ================= ELEMENT =================
const namaSiswaEl = document.getElementById("namaSiswa");
const infoUjianEl = document.getElementById("infoUjian");
const nilaiPGEl   = document.getElementById("nilaiPG");

const pgContainer       = document.getElementById("pgContainer");
const mcmaContainer     = document.getElementById("mcmaContainer");
const kategoriContainer = document.getElementById("kategoriContainer");
const essayContainer    = document.getElementById("essayContainer");

// ================= LOAD DATA =================
async function loadData() {
  try {
    const ref = doc(db, "jawaban_siswa", docId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("Data tidak ditemukan");
      return;
    }

    const d = snap.data();

    // ===== HEADER =====
    namaSiswaEl.textContent = d.namaSiswa || "-";
    infoUjianEl.textContent = `${d.mapel || "-"} · ${d.kelas || "-"}`;
    nilaiPGEl.textContent = d.nilaiPG || 0;

    // ================= PG =================
    const pg = d.jawabanPG || {};
    pgContainer.innerHTML = "";

    Object.keys(pg).sort().forEach((id, i) => {
      const jwb = pg[id];

      pgContainer.innerHTML += `
        <div class="essay-box">
          <b>Soal ${i + 1}</b>
          <p>Jawaban: <strong>${jwb || "-"}</strong></p>
        </div>
      `;
    });

    // ================= MCMA =================
    const mcma = d.jawabanMCMA || {};
    mcmaContainer.innerHTML = "";

    Object.keys(mcma).sort().forEach((id, i) => {
      const arr = mcma[id] || [];

      const jawaban = arr.length ? arr.join(", ") : "-";

      mcmaContainer.innerHTML += `
        <div class="essay-box">
          <b>Soal ${i + 1}</b>
          <p>Jawaban: <strong>${jawaban}</strong></p>
        </div>
      `;
    });

    // ================= KATEGORI =================
    const kategori = d.jawabanKategori || {};
    kategoriContainer.innerHTML = "";

    Object.keys(kategori).sort().forEach((id, i) => {
      const arr = kategori[id] || [];

      let isi = "";

      arr.forEach((val, idx) => {
        isi += `
          <li>
            Pernyataan ${idx + 1}: 
            <strong>${val === true ? "Benar" : val === false ? "Salah" : "-"}</strong>
          </li>
        `;
      });

      kategoriContainer.innerHTML += `
        <div class="essay-box">
          <b>Soal ${i + 1}</b>
          <ul>${isi || "<li>-</li>"}</ul>
        </div>
      `;
    });

    // ================= ESSAY =================
    const essay = d.jawabanEssay || {};
    essayContainer.innerHTML = "";

    Object.keys(essay).sort().forEach((id, i) => {
      const jwb = essay[id];

      essayContainer.innerHTML += `
        <div class="essay-box">
          <b>Soal ${i + 1}</b>
          <p>${jwb || "-"}</p>
        </div>
      `;
    });

  } catch (err) {
    console.error(err);
    alert("Gagal memuat data");
  }
}

// ================= INIT =================
loadData();