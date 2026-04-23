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

// ======================================================
// 🔥 AMBIL SEMUA SOAL + BUAT ID GLOBAL (WAJIB)
// ======================================================
async function ambilSemuaSoal(bankSoalId) {
  const snap = await getDoc(doc(db, "bank_soal", bankSoalId));
  if (!snap.exists()) return [];

  const bank = snap.data();

  let counter = 0;

  const soalPG = (bank.soalPG || []).map(s => ({
    tipe: "pg",
    id: counter++
  }));

  const soalMCMA = (bank.soalMCMA || []).map(s => ({
    tipe: "mcma",
    id: counter++
  }));

  const soalKategori = (bank.soalKategori || []).map(s => ({
    tipe: "kategori",
    id: counter++
  }));

  const soalEssay = (bank.soalEssay || []).map(s => ({
    ...s,
    tipe: "essay",
    id: counter++
  }));

  return [...soalPG, ...soalMCMA, ...soalKategori, ...soalEssay];
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

    mapelAktif = d.mapel || "";
    bankSoalId = d.bankSoalId || "";

    // ===== HEADER =====
    namaSiswaEl.textContent = d.namaSiswa || "-";
    infoUjianEl.textContent = `${d.mapel || "-"} · ${d.kelas || "-"}`;
    nilaiPGEl.textContent   = d.nilaiPG || 0;

    const jawabanEssay = d.jawabanEssay || {};
    nilaiEssayDetail   = d.nilaiEssayDetail || {};

    // 🔥 AMBIL SEMUA SOAL (SUDAH ADA ID GLOBAL)
    const semuaSoal = await ambilSemuaSoal(bankSoalId);

    const soalEssay = semuaSoal.filter(s => s.tipe === "essay");

    essayContainer.innerHTML = "";

    if (soalEssay.length === 0) {
      essayContainer.innerHTML = `<p><i>Tidak ada soal essay</i></p>`;
      return;
    }

    // ================= RENDER =================
    soalEssay.forEach((soal, i) => {
      const key = String(soal.id); // ✅ ID GLOBAL

      const jawaban = jawabanEssay?.[key] ?? "-";

      const rawNilai = nilaiEssayDetail?.[key];
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
                     data-id="${key}"
                     placeholder="0 - 20">
            </div>
          </div>

          <div class="blok-teks">
            <b>Pertanyaan:</b>
            <p>${soal?.pertanyaan || "-"}</p>
          </div>

          <div class="blok-teks">
            <b>Jawaban:</b>
            <p>${jawaban}</p>
          </div>

        </div>
      `;
    });

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

    document.querySelectorAll("input[data-id]").forEach(input => {
      const id = input.dataset.id;
      if (!id) return;

      let nilai = parseFloat(input.value);
      if (isNaN(nilai)) nilai = 0;

      nilai = Math.max(0, Math.min(20, nilai));

      nilaiEssayDetail[id] = nilai;
      totalEssay += nilai;
    });

    const semuaSoal = await ambilSemuaSoal(bankSoalId);
    const soalEssay = semuaSoal.filter(s => s.tipe === "essay");

    const maxEssay = soalEssay.length * 20;

    const nilaiEssayNormal =
      maxEssay > 0 ? (totalEssay / maxEssay) * 100 : 0;

    const nilaiPG = parseFloat(nilaiPGEl.textContent) || 0;

    const nilaiTotal = (nilaiPG + nilaiEssayNormal) / 2;

    await updateDoc(jawabanRef, {
      nilaiEssayDetail,
      nilaiEssay: Number(totalEssay.toFixed(2)),
      nilaiEssayNormal: Number(nilaiEssayNormal.toFixed(2)),
      nilaiTotal: Number(nilaiTotal.toFixed(2)),
      statusNilai: "sudah_dinilai",
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