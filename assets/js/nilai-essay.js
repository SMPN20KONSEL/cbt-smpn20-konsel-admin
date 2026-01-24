import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= PARAM URL =================
const params = new URLSearchParams(window.location.search);
const docId  = params.get("docId");
const back   = params.get("return") || "koreksi-essay.html";
const mapel  = params.get("mapel");
const kelas  = params.get("kelas");

// ================= VALIDASI =================
if (!docId) {
  alert("docId tidak ditemukan");
  window.location.href = back;
  throw new Error("docId kosong");
}

// ================= ELEMENT =================
const namaSiswaEl    = document.getElementById("namaSiswa");
const infoUjianEl    = document.getElementById("infoUjian");
const nilaiPGEl      = document.getElementById("nilaiPG");
const essayContainer = document.getElementById("essayContainer");
const btnSimpan      = document.getElementById("btnSimpan");

// ================= DATA =================
let jawabanRef;
let nilaiEssayDetail = {};

// ================= AMBIL BANK SOAL =================
async function ambilSoalEssay(mapel) {
  const q = query(
    collection(db, "bank_soal"),
    where("mapel", "==", mapel)
  );

  const snap = await getDocs(q);
  if (snap.empty) return [];

  return snap.docs[0].data().soalEssay || [];
}

// ================= LOAD DATA =================
async function loadData() {
  jawabanRef = doc(db, "jawaban_siswa", docId);
  const snap = await getDoc(jawabanRef);

  if (!snap.exists()) {
    alert("Data tidak ditemukan");
    window.location.href = back;
    return;
  }

  const d = snap.data();

  // ===== HEADER =====
  namaSiswaEl.textContent = d.namaSiswa || "-";
  infoUjianEl.textContent = `${d.mapel} · ${d.kelas}`;
  nilaiPGEl.textContent  = d.nilaiPG || 0;

  // ===== ESSAY =====
  essayContainer.innerHTML = "";
  nilaiEssayDetail = d.nilaiEssayDetail || {};

  const jawabanEssay = d.jawabanEssay || {};
  const soalEssay    = await ambilSoalEssay(d.mapel);

  if (soalEssay.length === 0) {
    essayContainer.innerHTML = `<p><i>Tidak ada soal essay</i></p>`;
    return;
  }

  soalEssay.forEach((soal, i) => {
    const jawaban = jawabanEssay[soal.id] || "-";
    const nilai   = nilaiEssayDetail[soal.id] ?? 0;

    essayContainer.innerHTML += `
      <div class="essay-box">
        <div class="baris-soal">
          <div class="soal">Soal ${i + 1}</div>
          <div class="input-nilai">
            <label>Nilai</label>
            <input type="number"
                   min="0"
                   max="${soal.skorMax}"
                   value="${nilai}"
                   data-id="${soal.id}">
          </div>
        </div>

        <div class="blok-teks">
          <b>Pertanyaan:</b>
          <p>${soal.pertanyaan}</p>
        </div>

        <div class="blok-teks">
          <b>Jawaban:</b>
          <p>${jawaban}</p>
        </div>
      </div>
    `;
  });

  // ===== KUNCI JIKA SUDAH DINILAI =====
  if (d.statusNilai === "sudah_dinilai") {
    btnSimpan.disabled = true;
    btnSimpan.textContent = "Sudah Dinilai";
    essayContainer
      .querySelectorAll("input")
      .forEach(i => i.disabled = true);
  }
}

// ================= SIMPAN NILAI =================
btnSimpan.onclick = async () => {
  try {
    let totalEssay = 0;

    document.querySelectorAll("input[data-id]").forEach(input => {
      const id    = input.dataset.id;
      const nilai = Number(input.value) || 0;

      nilaiEssayDetail[id] = nilai;
      totalEssay += nilai;
    });

    const nilaiPG    = Number(nilaiPGEl.textContent) || 0;
    const nilaiTotal = nilaiPG + totalEssay;

    await updateDoc(jawabanRef, {
      nilaiEssayDetail,
      nilaiEssay: totalEssay,
      nilaiTotal,
      statusNilai: "sudah_dinilai"
    });

    btnSimpan.textContent = "Tersimpan ✓";
    btnSimpan.disabled = true;

    setTimeout(() => {
      let url = back;
      if (mapel && kelas) {
        url += `?mapel=${encodeURIComponent(mapel)}&kelas=${encodeURIComponent(kelas)}`;
      }
      window.location.href = url;
    }, 800);

  } catch (err) {
    console.error(err);
    alert("❌ Gagal menyimpan nilai");
  }
};

// ================= INIT =================
loadData();
