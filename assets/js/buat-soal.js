// ======================================================
// ======================= FIREBASE =====================
// ======================================================
import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";


// ======================================================
// ======================= ELEMENT ======================
// ======================================================
const daftarSoal = document.getElementById("daftarSoal");
const toastBox   = document.getElementById("toast");

const judulUjian = document.getElementById("judulUjian");
const mapelInput = document.getElementById("mapelInput");
const kelasInput = document.getElementById("kelasInput");

const btnSimpan  = document.getElementById("btnSimpan");


// ======================================================
// ======================== UTIL ========================
// ======================================================
function buatSoalId(prefix, nomor) {
  return `${prefix}${nomor}`;
}

function buatDocId(judul, mapel, kelas) {
  return `${judul}_${mapel}_${kelas}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function bersihkanPertanyaan(text = "") {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s*\((pg|esai|essay|pilihan ganda)\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}


// ======================================================
// ======================== TOAST =======================
// ======================================================
function toast(msg, type = "success") {
  const div = document.createElement("div");
  div.className = `toast-item toast-${type}`;
  div.innerText = msg;

  toastBox.appendChild(div);

  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(-10px)";
    setTimeout(() => div.remove(), 300);
  }, 3000);
}


// ======================================================
// ======================= LOADING ======================
// ======================================================
function setLoading(btn, text = "⏳ Loading...") {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.text = btn.innerHTML;
  btn.innerHTML = text;
}

function stopLoading(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = btn.dataset.text;
}


// ======================================================
// ===================== TAMBAH SOAL ====================
// ======================================================
window.tambahSoal = (data = null) => {
  const card = document.createElement("div");
  card.className = "soal-card";
  card.style.border = "1px solid #ccc";
  card.style.padding = "15px";
  card.style.marginBottom = "15px";
  card.style.borderRadius = "10px";

  card.innerHTML = `
    <select class="tipe-soal">
      <option value="pg">Pilihan Ganda</option>
      <option value="esai">Esai</option>
    </select>

    <div class="pertanyaan" contenteditable style="margin-top:8px"></div>

    ${data?.gambar ? `<img src="${data.gambar}" style="max-width:100%;margin:10px 0">` : ""}

    <div class="pg-options" style="margin-top:8px">
      ${["A","B","C","D"].map(l => `
        <div style="display:flex; align-items:center; margin-bottom:6px;">
          <b style="width:25px;">${l}.</b>
          <span contenteditable class="opsi-input"
            style="flex:1; border:1px solid #ccc; padding:6px; border-radius:6px; min-height:30px;">
          </span>
        </div>
      `).join("")}

      <select class="jawaban">
        <option value="">Kunci Jawaban</option>
        ${["A","B","C","D"].map(l => `<option>${l}</option>`).join("")}
      </select>
    </div>

    <div style="margin-top:10px; display:flex; gap:10px;">
      <button type="button" onclick="tambahSoalDiBawah(this)">➕ Tambah</button>
      <button type="button" onclick="this.closest('.soal-card').remove()">🗑 Hapus</button>
    </div>
  `;

  daftarSoal.appendChild(card);

  const tipe  = card.querySelector(".tipe-soal");
  const pgBox = card.querySelector(".pg-options");

  tipe.onchange = () => {
    pgBox.style.display = tipe.value === "pg" ? "block" : "none";
  };

  if (data) {
    tipe.value = data.tipe;
    card.querySelector(".pertanyaan").innerText =
      bersihkanPertanyaan(data.pertanyaan || "");

    if (data.tipe === "pg") {
      const opsiEl = card.querySelectorAll(".opsi-input");
      Object.entries(data.opsi || {}).forEach(([_, v], i) => {
        if (opsiEl[i]) opsiEl[i].innerText = v;
      });
      card.querySelector(".jawaban").value = data.jawabanBenar || "";
    }
  }

  tipe.dispatchEvent(new Event("change"));
};


// ======================================================
// ================= TAMBAH DI BAWAH ====================
// ======================================================
window.tambahSoalDiBawah = (btn) => {
  const cardLama = btn.closest(".soal-card");

  const wrapper = document.createElement("div");
  daftarSoal.appendChild(wrapper);

  tambahSoal();

  const cardBaru = daftarSoal.lastElementChild;
  cardLama.after(cardBaru);
};


// ======================================================
// ===================== IMPORT WORD ====================
// ======================================================
window.importWord = async (btn) => {
  setLoading(btn, "📄 Importing...");
  try {
    const file = document.getElementById("fileWord").files[0];
    if (!file) throw new Error("Pilih file Word (.docx)");

    if (daftarSoal.children.length > 0) {
      if (!confirm("Soal lama akan diganti. Lanjut?")) {
        stopLoading(btn);
        return;
      }
      daftarSoal.innerHTML = "";
    }

    const buffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        convertImage: mammoth.images.inline(image => {
          return image.read("base64").then(base64 => ({
            src: `data:${image.contentType};base64,${base64}`
          }));
        })
      }
    );

    parseSoalHtml(result.value);

    toast("✅ Import Word berhasil");
  } catch (err) {
    toast("❌ " + err.message, "error");
  } finally {
    stopLoading(btn);
  }
};


// ======================================================
// ==================== PARSER WORD =====================
// ======================================================
function parseSoalHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  const paragraphs = temp.querySelectorAll("p");

  let soal = null;

  paragraphs.forEach(p => {
    let text = p.innerText.trim();
    if (!text) return;

    // DETEKSI NOMOR SOAL
    if (/^\d+[\.\)]/.test(text)) {
      if (soal) tambahSoal(soal);

      soal = {
        tipe: "esai",
        pertanyaan: "",
        opsi: {},
        jawabanBenar: "",
        gambar: null
      };

      text = text.replace(/^\d+[\.\)]\s*/, "");
    }

    if (!soal) return;

    // OPSI A-D
    const opsiMatch = text.match(/^([A-D])[\.\)]\s*(.*)/i);
    if (opsiMatch) {
      soal.tipe = "pg";
      soal.opsi[opsiMatch[1].toUpperCase()] =
        bersihkanPertanyaan(opsiMatch[2]);
      return;
    }

    // KUNCI
    if (/KUNCI\s*:/i.test(text)) {
      soal.jawabanBenar =
        text.replace(/KUNCI\s*:/i, "").trim().toUpperCase();
      return;
    }

    // PERTANYAAN
    soal.pertanyaan += " " + bersihkanPertanyaan(text);
  });

  if (soal) tambahSoal(soal);
}

// ======================================================
// ================= DOWNLOAD TEMPLATE ==================
// ======================================================
window.downloadTemplate = async () => {
  const { Document, Packer, Paragraph } = window.docx;

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph("SOAL PILIHAN GANDA"),
          new Paragraph(""),

          new Paragraph("1. Berapakah 2 + 2? "),
          new Paragraph("A. 1 "),
          new Paragraph("B. 2 "),
          new Paragraph("C. 4 "),
          new Paragraph("D. 5 "),
          new Paragraph("KUNCI: C"),

          new Paragraph(""),
          new Paragraph("2. Ibu kota Indonesia adalah? "),
          new Paragraph("A. Bandung "),
          new Paragraph("B. Jakarta "),
          new Paragraph("C. Surabaya "),
          new Paragraph("D. Medan "),
          new Paragraph("KUNCI: B"),

          new Paragraph(""),
          new Paragraph("SOAL ESAI"),
          new Paragraph(""),

          new Paragraph("3. Jelaskan arti kemerdekaan! "),
          new Paragraph("4. Sebutkan 3 energi terbarukan! ")
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Soal.docx";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};


// ======================================================
// ===================== SIMPAN SEMUA ===================
// ======================================================
window.simpanSemua = async () => {
  setLoading(btnSimpan, "💾 Menyimpan...");
  try {
    const judul = judulUjian.value.trim();
    const mapel = mapelInput.value.trim();
    const kelas = kelasInput.value.trim();

    if (!judul || !mapel || !kelas) {
      throw new Error("Judul, mapel, dan kelas wajib diisi");
    }

    const docId = buatDocId(judul, mapel, kelas);
    const docRef = doc(db, "bank_soal", docId);

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      throw new Error("Soal sudah ada");
    }

    const soalPG = [];
    const soalEssay = [];

    document.querySelectorAll(".soal-card").forEach(card => {
      const tipe = card.querySelector(".tipe-soal").value;
      const pertanyaan = bersihkanPertanyaan(
        card.querySelector(".pertanyaan").innerText
      );
      const gambar = card.querySelector("img")?.src || null;

      if (tipe === "pg") {
        const opsi = {};
        card.querySelectorAll(".opsi-input").forEach((o, i) => {
          if (o.innerText.trim()) {
            opsi[String.fromCharCode(65 + i)] = o.innerText.trim();
          }
        });

        const kunci = card.querySelector(".jawaban").value;
        if (!kunci) return;

        soalPG.push({
          id: buatSoalId("PG", soalPG.length + 1),
          pertanyaan,
          gambar,
          opsi,
          jawabanBenar: kunci
        });
      } else {
        if (!pertanyaan && !gambar) return;

        soalEssay.push({
          id: buatSoalId("E", soalEssay.length + 1),
          pertanyaan,
          gambar,
          skorMax: 10
        });
      }
    });

    await setDoc(docRef, {
      judul,
      mapel,
      kelas,
      soalPG,
      soalEssay,
      dibuat: serverTimestamp()
    });

    toast("✅ Soal berhasil disimpan");
    daftarSoal.innerHTML = "";

  } catch (err) {
    toast("❌ " + err.message, "error");
  } finally {
    stopLoading(btnSimpan);
  }
};
window.previewSoal = () => {
  const box = document.getElementById("previewBox");
  const pgBox = document.getElementById("previewPG");
  const esaiBox = document.getElementById("previewEsai");

  box.style.display = "block";
  pgBox.innerHTML = "";
  esaiBox.innerHTML = "";

  let noPG = 1;
  let noE = 1;

  document.querySelectorAll(".soal-card").forEach(card => {
    const tipe = card.querySelector(".tipe-soal").value;
    const pertanyaan = card.querySelector(".pertanyaan").innerText;
    const gambar = card.querySelector("img")?.src;

    if (tipe === "pg") {
      let html = `<div><b>${noPG}. ${pertanyaan}</b>`;
      if (gambar) html += `<br><img src="${gambar}" style="max-width:200px">`;

      card.querySelectorAll(".opsi-input").forEach((o, i) => {
        if (o.innerText.trim()) {
          html += `<div>${String.fromCharCode(65+i)}. ${o.innerText}</div>`;
        }
      });

      html += "</div><br>";
      pgBox.innerHTML += html;
      noPG++;
    } else {
      let html = `<div><b>${noE}. ${pertanyaan}</b>`;
      if (gambar) html += `<br><img src="${gambar}" style="max-width:200px">`;
      html += "</div><br>";

      esaiBox.innerHTML += html;
      noE++;
    }
  });
};
btnSimpan?.addEventListener("click", e => {
  e.preventDefault();
  simpanSemua();
});