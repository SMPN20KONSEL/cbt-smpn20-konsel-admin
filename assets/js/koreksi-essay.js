import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";


// ================= SESSION =================

const guruUid = localStorage.getItem("uid");
const role    = localStorage.getItem("role");

if (!guruUid || role !== "guru") {

  alert("Session habis / akses ditolak");

  location.href = "../login.html";

}


// ================= ELEMENT =================

const judulUjianEl = document.getElementById("judulUjian");
const kelasEl      = document.getElementById("kelas");
const tabel        = document.getElementById("tabel");
const btnFilter    = document.getElementById("filter");

// ===== MODAL =====
const modalKoreksi = document.getElementById("modalKoreksi");

const namaSiswaEl    = document.getElementById("namaSiswa");
const infoUjianEl    = document.getElementById("infoUjian");
const nilaiPGEl      = document.getElementById("nilaiPG");
const essayContainer = document.getElementById("essayContainer");
const btnSimpan      = document.getElementById("btnSimpan");


// ================= DATA =================

let jawabanRef;
let currentDocId = "";

let nilaiEssayDetail = {};

let mapelAktif = "";
let bankSoalId = "";


// ======================================================
// 🔥 AMBIL SEMUA SOAL
// ======================================================

async function ambilSemuaSoal(bankSoalId) {

  const snap = await getDoc(
    doc(db, "bank_soal", bankSoalId)
  );

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

  return [
    ...soalPG,
    ...soalMCMA,
    ...soalKategori,
    ...soalEssay
  ];

}


// ================= RENDER TABEL =================

function renderTabel(snap) {

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

  let html = "";

  snap.forEach(docu => {

    const d = docu.data();

    const adaEssay =
      Object.keys(d.jawabanEssay || {}).length > 0;

    let status = "";

    // ===== STATUS =====

    if (!adaEssay) {

      status = `
        <span class="badge sudah">
          Tidak Perlu Koreksi
        </span>
      `;

    }

    else if (d.statusNilai === "sudah_dinilai") {

      status = `
        <span class="badge sudah">
          Sudah di Koreksi
        </span>
      `;

    }

    else {

      status = `
        <span class="badge belum">
          Belum di Koreksi
        </span>
      `;

    }

    // ===== HTML =====

    html += `
      <tr>

        <td>${d.namaSiswa}</td>

        <td>${d.kelas}</td>

        <td>${d.judulUjian || "-"}</td>

        <td>${status}</td>

        <td style="display:flex; gap:6px">

          <!-- LIHAT -->
          <button
            onclick="lihatJawaban('${docu.id}')"
            style="
              background:#3498db;
              color:white;
              border:none;
              padding:6px 10px;
              border-radius:6px
            "
          >
            👁 Lihat
          </button>

          <!-- KOREKSI -->
          ${adaEssay ? `

            <button
              onclick="bukaModal('${docu.id}')"
              style="
                background:#2ecc71;
                color:white;
                border:none;
                padding:6px 10px;
                border-radius:6px
              "
            >
              ✏️ Koreksi
            </button>

          ` : `

            <button
              disabled
              style="
                background:#bdc3c7;
                color:white;
                border:none;
                padding:6px 10px;
                border-radius:6px;
                cursor:not-allowed
              "
            >
              Tidak Ada Essay
            </button>

          `}

        </td>

      </tr>
    `;
  });

  tabel.innerHTML = html;

}


// ================= LOAD FILTER =================

async function loadFilter() {

  const q = query(
    collection(db, "jawaban_siswa"),
    where("guruId", "==", guruUid)
  );

  const snap = await getDocs(q);

  const judulSet = new Set();
  const kelasSet = new Set();

  snap.forEach(docu => {

    const d = docu.data();

    if (d.judulUjian)
      judulSet.add(d.judulUjian);

    if (d.kelas)
      kelasSet.add(d.kelas);

  });

  // ===== RESET OPTION =====

  judulUjianEl.innerHTML =
    `<option value="">-- Pilih Judul Ujian --</option>`;

  kelasEl.innerHTML =
    `<option value="">-- Pilih Kelas --</option>`;

  // ===== JUDUL =====

  judulSet.forEach(j => {

    judulUjianEl.innerHTML += `
      <option value="${j}">
        ${j}
      </option>
    `;

  });

  // ===== KELAS =====

  kelasSet.forEach(k => {

    kelasEl.innerHTML += `
      <option value="${k}">
        ${k}
      </option>
    `;

  });

}


// ================= FILTER =================

btnFilter.onclick = async () => {

  const judulUjian = judulUjianEl.value;
  const kelas      = kelasEl.value;

  let conditions = [
    where("guruId", "==", guruUid)
  ];

  // ===== FILTER JUDUL =====

  if (judulUjian) {

    conditions.push(
      where("judulUjian", "==", judulUjian)
    );

  }

  // ===== FILTER KELAS =====

  if (kelas) {

    conditions.push(
      where("kelas", "==", kelas)
    );

  }

  const q = query(
    collection(db, "jawaban_siswa"),
    ...conditions
  );

  const snap = await getDocs(q);

  renderTabel(snap);

};


// ================= TAMPILKAN SEMUA =================

async function tampilkanSemua() {

  const q = query(
    collection(db, "jawaban_siswa"),
    where("guruId", "==", guruUid)
  );

  const snap = await getDocs(q);

  renderTabel(snap);

}


// ================= BUKA MODAL =================

window.bukaModal = async (docId) => {

  try {

    currentDocId = docId;

    // ===== TAMPILKAN MODAL =====

    modalKoreksi.style.display = "flex";

    // ===== REF DOC =====

    jawabanRef = doc(
      db,
      "jawaban_siswa",
      currentDocId
    );

    const snap = await getDoc(jawabanRef);

    if (!snap.exists()) {

      alert("Data tidak ditemukan");

      return;
    }

    const d = snap.data();

    mapelAktif = d.mapel || "";
    bankSoalId = d.bankSoalId || "";

    // ===== HEADER =====

    namaSiswaEl.textContent =
      d.namaSiswa || "-";

    infoUjianEl.textContent =
      `${d.mapel || "-"} · ${d.kelas || "-"}`;

    nilaiPGEl.textContent =
      d.nilaiPG || 0;

    // ===== DATA ESSAY =====

    const jawabanEssay =
      d.jawabanEssay || {};

    nilaiEssayDetail =
      d.nilaiEssayDetail || {};

    // ===== AMBIL SOAL =====

    const semuaSoal =
      await ambilSemuaSoal(bankSoalId);

    const soalEssay =
      semuaSoal.filter(
        s => s.tipe === "essay"
      );

    essayContainer.innerHTML = "";

    // ===== TIDAK ADA ESSAY =====

    if (soalEssay.length === 0) {

      essayContainer.innerHTML = `
        <p>
          <i>Tidak ada soal essay</i>
        </p>
      `;

      return;
    }

    // ===== RENDER ESSAY =====

    soalEssay.forEach((soal, i) => {

      const key = String(soal.id);

      const jawaban =
        jawabanEssay?.[key] ?? "-";

      const rawNilai =
        nilaiEssayDetail?.[key];

      const nilai =
        (!isNaN(rawNilai) &&
        rawNilai !== undefined)
          ? rawNilai
          : "";

      essayContainer.innerHTML += `

        <div class="essay-box">

          <!-- HEADER -->
          <div class="baris-soal">

            <div class="soal">
              Soal ${i + 1}
            </div>

            <div class="input-nilai">

              <label>
                Nilai (max 20)
              </label>

              <input
                type="number"
                min="0"
                max="20"
                value="${nilai}"
                data-id="${key}"
                placeholder="0 - 20"
              >

            </div>

          </div>

          <!-- PERTANYAAN -->
          <div class="blok-teks">

            <b>Pertanyaan:</b>

            <p>
              ${soal?.pertanyaan || "-"}
            </p>

          </div>

          <!-- JAWABAN -->
          <div class="blok-teks">

            <b>Jawaban:</b>

            <p>
              ${jawaban}
            </p>

          </div>

        </div>

      `;
    });

    // ===== STATUS BUTTON =====

    if (d.statusNilai === "sudah_dinilai") {

      btnSimpan.textContent =
        "Update Nilai";

    }

    else {

      btnSimpan.textContent =
        "💾 Simpan Nilai Essay";

    }

  }

  catch (err) {

    console.error(err);

    alert("❌ Gagal memuat data");

  }

};


// ================= TUTUP MODAL =================

window.tutupModal = () => {

  modalKoreksi.style.display = "none";

};


// ================= SIMPAN NILAI =================

btnSimpan.onclick = async () => {

  try {

    let totalEssay = 0;

    nilaiEssayDetail = {};

    // ===== AMBIL NILAI =====

    document
      .querySelectorAll("input[data-id]")
      .forEach(input => {

        const id = input.dataset.id;

        if (!id) return;

        let nilai =
          parseFloat(input.value);

        if (isNaN(nilai))
          nilai = 0;

        // ===== LIMIT 0-20 =====

        nilai = Math.max(
          0,
          Math.min(20, nilai)
        );

        nilaiEssayDetail[id] = nilai;

        totalEssay += nilai;

      });

    // ===== AMBIL SOAL =====

    const semuaSoal =
      await ambilSemuaSoal(bankSoalId);

    const soalEssay =
      semuaSoal.filter(
        s => s.tipe === "essay"
      );

    // ===== HITUNG =====

    const maxEssay =
      soalEssay.length * 20;

    const nilaiEssayNormal =
      maxEssay > 0
        ? (totalEssay / maxEssay) * 100
        : 0;

    const nilaiPG =
      parseFloat(
        nilaiPGEl.textContent
      ) || 0;

    const totalNilai =
      (nilaiPG * 0.7) +
      (nilaiEssayNormal * 0.3);

    // ===== UPDATE FIREBASE =====

    await updateDoc(jawabanRef, {

      nilaiEssayDetail,

      nilaiEssay:
        Number(totalEssay.toFixed(2)),

      nilaiEssayNormal:
        Number(nilaiEssayNormal.toFixed(2)),

      totalNilai:
        Number(totalNilai.toFixed(2)),

      statusNilai:
        "sudah_dinilai"

    });

    // ===== BUTTON =====

    btnSimpan.textContent =
      "✔ Tersimpan";

    // ===== REFRESH TABEL =====

    btnFilter.click();

    // ===== TUTUP MODAL =====

    setTimeout(() => {

      tutupModal();

    }, 500);

  }

  catch (err) {

    console.error(err);

    alert("❌ Gagal menyimpan nilai");

  }

};


// ================= NAVIGASI =================

window.lihatJawaban = (docId) => {

  location.href =
    `lihat-jawaban.html?docId=${docId}`;

};


// ================= AUTO LOAD =================

window.addEventListener("load", async () => {

  await loadFilter();

  tampilkanSemua();

});