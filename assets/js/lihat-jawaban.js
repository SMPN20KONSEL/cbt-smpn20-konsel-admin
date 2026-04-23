import { db } from "./firebase.js";
import { doc, getDoc } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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

const nilaiPGEl = document.getElementById("nilaiPG");
const nilaiEssayEl = document.getElementById("nilaiEssay");

const pgContainer       = document.getElementById("pgContainer");
const mcmaContainer     = document.getElementById("mcmaContainer");
const kategoriContainer = document.getElementById("kategoriContainer");
const essayContainer    = document.getElementById("essayContainer");

// ================= LOAD DATA =================
async function loadData() {
  try {

    // ===== AMBIL DATA JAWABAN =====
    const snap = await getDoc(doc(db, "jawaban_siswa", docId));

    if (!snap.exists()) {
      alert("Data tidak ditemukan");
      return;
    }

    const d = snap.data();

    // ===== HEADER =====
    namaSiswaEl.textContent = d.namaSiswa || "-";
    infoUjianEl.textContent = `${d.mapel || "-"} · ${d.kelas || "-"}`;

    // ===== AMBIL BANK SOAL =====
    const soalSnap = await getDoc(doc(db, "bank_soal", d.bankSoalId));

    if (!soalSnap.exists()) {
      alert("Bank soal tidak ditemukan");
      return;
    }

    const bank = soalSnap.data();

    let totalNilai = 0;
    let totalSoal = 0;
let globalIndex = 0;
    // ================= PG =================
    pgContainer.innerHTML = "";

 (bank.soalPG || []).forEach((s, i) => {

  const id = String(globalIndex++);
  const jwb = d.jawabanPG?.[id];

  const kunci = s.jawabanBenar || s.kunci || "-";

  const benar = jwb === kunci;

  totalSoal++;
  if (benar) totalNilai++;

  pgContainer.innerHTML += `
    <div class="essay-box ${benar ? "benar" : "salah"}">
      <b>Soal ${i + 1}</b>
      <p>${s.pertanyaan || "-"}</p>
      <p>Jawaban siswa : <strong>${jwb || "-"}</strong></p>
      <p>Kunci : ${kunci}</p>
    </div>
  `;
});

    // ================= MCMA =================
    mcmaContainer.innerHTML = "";

(bank.soalMCMA || []).forEach((s, i) => {

  const id = String(globalIndex++);
  const jwb = d.jawabanMCMA?.[id] || [];

  const kunci = s.jawabanBenar || [];

  const benar =
    JSON.stringify([...jwb].sort()) ===
    JSON.stringify([...kunci].sort());

  totalSoal++;
  if (benar) totalNilai++;

  mcmaContainer.innerHTML += `
    <div class="essay-box ${benar ? "benar" : "salah"}">
      <b>Soal ${i + 1}</b>
      <p>${s.pertanyaan || "-"}</p>
      <p>Jawaban siswa : ${jwb.length ? jwb.join(", ") : "-"}</p>
      <p>Kunci : ${kunci.join(", ")}</p>
    </div>
  `;
});

    // ================= KATEGORI =================
    kategoriContainer.innerHTML = "";

(bank.soalKategori || []).forEach((s, i) => {

  const id = String(globalIndex++); // ✅ FIX
  const jwb = d.jawabanKategori?.[id] || [];

  let benar = true;

  (s.pernyataan || []).forEach((p, idx) => {
    if (jwb[idx] !== p.jawabanBenar) benar = false;
  });

  totalSoal++;
  if (benar) totalNilai++;

  let isi = "";

  (s.pernyataan || []).forEach((p, idx) => {
    isi += `
      <li>
        ${p.teks} → 
        <b>jawaban siswa : ${jwb[idx] ? "Benar" : "Salah"}</b>
        (Kunci: ${p.jawabanBenar ? "Benar" : "Salah"})
      </li>
    `;
  });

  kategoriContainer.innerHTML += `
    <div class="essay-box ${benar ? "benar" : "salah"}">
      <b>Soal ${i + 1}</b>
      <ul>${isi}</ul>
    </div>
  `;
});

    // ================= ESSAY =================
    essayContainer.innerHTML = "";

(bank.soalEssay || []).forEach((s, i) => {

  const id = String(globalIndex++);
  const jwb = d.jawabanEssay?.[id];

  essayContainer.innerHTML += `
    <div class="essay-box">
      <b>Soal ${i + 1}</b>
      <p>${s.pertanyaan || "-"}</p>
      <p>Jawaban siswa : ${jwb || "-"}</p>
    </div>
  `;
});

    // ===== NILAI =====
    const nilaiPG = Number(d.nilaiPG || 0);

    const nilaiEssay = Number(
      d.nilaiEssayNormal ??
      d.nilaiEssay ??
      0
    );

nilaiPGEl.textContent = Math.round(nilaiPG);
nilaiEssayEl.textContent = Math.round(nilaiEssay);

    // ===== DEBUG =====
    console.log("DATA:", d);

  } catch (err) {
    console.error(err);
    alert("Gagal memuat data");
  }
}
// ================= INIT =================
loadData();