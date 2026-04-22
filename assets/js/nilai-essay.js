import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= PARAM URL =================
const params = new URLSearchParams(window.location.search);
const docId  = params.get("docId");
const back   = params.get("return") || "koreksi-essay.html";
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
let mapelAktif = "";
let bankSoalId = "";

// ================= AMBIL BANK SOAL (FIX UTAMA) =================
async function ambilSoalEssayById(id) {
  if (!id) return [];

  const snap = await getDoc(doc(db, "bank_soal", id));

  if (!snap.exists()) return [];

  return snap.data().soalEssay || [];
}

// ================= LOAD DATA =================
async function loadData() {
  try {
    jawabanRef = doc(db, "jawaban_siswa", docId);
    const snap = await getDoc(jawabanRef);

    if (!snap.exists()) {
      alert("Data tidak ditemukan");
      window.location.href = back;
      return;
    }

    const d = snap.data();

    // ✅ AMBIL DATA PENTING
    mapelAktif = d.mapel || "";
    bankSoalId = d.bankSoalId || "";

    // ===== HEADER =====
    namaSiswaEl.textContent = d.namaSiswa || "-";
    infoUjianEl.textContent = `${d.mapel || "-"} · ${d.kelas || "-"}`;
    nilaiPGEl.textContent   = d.nilaiPG || 0;

    // ===== DATA JAWABAN =====
    const jawabanEssay = d.jawabanEssay || {};
    nilaiEssayDetail   = d.nilaiEssayDetail || {};

    // ===== AMBIL SOAL (FIX UTAMA) =====
    const soalEssay = await ambilSoalEssayById(bankSoalId);

    essayContainer.innerHTML = "";

    if (soalEssay.length === 0) {
      essayContainer.innerHTML = `<p><i>Tidak ada soal essay</i></p>`;
      return;
    }

    // ===== RENDER =====
    soalEssay.forEach((soal, i) => {

      // 🔥 FIX BESAR: fallback kalau ID tidak cocok
      const jawaban =
        jawabanEssay[soal.id] ??
        jawabanEssay[`essay_${i}`] ??
        "-";

      const rawNilai = nilaiEssayDetail[soal.id];
      const nilai = (!isNaN(rawNilai) && rawNilai !== undefined)
        ? rawNilai
        : "";

      essayContainer.innerHTML += `
        <div class="essay-box">
          <div class="baris-soal">
            <div class="soal">Soal ${i + 1}</div>

            <div class="input-nilai">
              <label>Nilai (max 20)</label>
              <input type="number"
                     min="0"
                     max="20"
                     value="${nilai}"
                     data-id="${soal.id}"
                     placeholder="0 - 20">
            </div>
          </div>

          <div class="blok-teks">
            <b>Pertanyaan:</b>
            <p>${soal.pertanyaan || "-"}</p>
          </div>

          <div class="blok-teks">
            <b>Jawaban:</b>
            <p>${jawaban}</p>
          </div>
        </div>
      `;
    });

    // ===== STATUS BUTTON =====
    if (d.statusNilai === "sudah_dinilai") {
      btnSimpan.textContent = "Update Nilai";
    }

  } catch (err) {
    console.error(err);
    alert("❌ Gagal memuat data");
  }
}

// ================= SIMPAN NILAI =================
btnSimpan.onclick = async () => {
  try {
    let totalEssay = 0;
    nilaiEssayDetail = {};

    // ===== AMBIL INPUT NILAI =====
    document.querySelectorAll("input[data-id]").forEach(input => {
      const id = input.dataset.id;
      if (!id) return;

      let nilai = parseFloat(input.value);
      if (isNaN(nilai)) nilai = 0;

      nilai = Math.max(0, Math.min(20, nilai));

      nilaiEssayDetail[id] = nilai;
      totalEssay += nilai;
    });

    // ===== AMBIL SOAL LAGI =====
    const soalEssay = await ambilSoalEssayById(bankSoalId);

    if (soalEssay.length === 0) {
      alert("Soal essay tidak ditemukan!");
      return;
    }

    const maxEssay = soalEssay.length * 20;

    const nilaiEssayNormal =
      maxEssay > 0 ? (totalEssay / maxEssay) * 100 : 0;

    const nilaiPG = parseFloat(nilaiPGEl.textContent) || 0;

    const nilaiTotal = (nilaiPG + nilaiEssayNormal) / 2;

    // ===== UPDATE FIRESTORE =====
    await updateDoc(jawabanRef, {
      nilaiEssayDetail,
      nilaiEssay: Number(totalEssay.toFixed(2)),
      nilaiEssayNormal: Number(nilaiEssayNormal.toFixed(2)),
      nilaiTotal: Number(nilaiTotal.toFixed(2)),
      statusNilai: "sudah_dinilai",

      // hapus field lama
      totalNilai: null
    });

    btnSimpan.textContent = "✔ Tersimpan (bisa diedit lagi)";

    setTimeout(() => {
      let url = back;

      if (mapelAktif && kelas) {
        url += `?mapel=${encodeURIComponent(mapelAktif)}&kelas=${encodeURIComponent(kelas)}`;
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