import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const bankId = params.get("id");

const judulEl = document.getElementById("judul");
const infoEl  = document.getElementById("info");
const listEl  = document.getElementById("soal-list");

let dataBank = {};
let currentJenis = "";
let currentIndex = 0;

// VALIDASI
if (!bankId) {
  listEl.innerHTML = "<p style='color:red'>❌ ID bank soal tidak ditemukan</p>";
  throw new Error("ID bank soal kosong");
}

// ================= LOAD =================
async function loadSoal(){
listEl.innerHTML = "<p>⏳ Memuat soal...</p>";

  try {
    const ref = doc(db, "bank_soal", bankId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      listEl.innerHTML = "<p>❌ Data bank soal tidak ditemukan</p>";
      return;
    }

    const data = snap.data();
    dataBank = data; // ✅ TAMBAHKAN INI

    // HEADER
    judulEl.textContent = data.judul || "-";
    infoEl.textContent = `${data.mapel || "-"} • Kelas ${data.kelas || "-"}`;

    listEl.innerHTML = "";
    let no = 1;

  function renderBox(jenis,label,s,i){
    let opsiHTML = "";

if (s.opsi) {
  Object.entries(s.opsi)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([k,v]) => {
      opsiHTML += `<div>${k}. ${v}</div>`;
    });
}

    listEl.innerHTML += `
      <div class="soal-box">
        <div class="soal-header">
          <span class="jenis ${label}">${label.toUpperCase()}</span>
          <button class="btn-edit" onclick="editSoal('${jenis}',${i})">✏️</button>
        </div>

        <b>Soal ${no++}</b>
        <div>${s.pertanyaan || ""}</div>
        <div>${opsiHTML}</div>
      </div>
    `;
  }

 
// =====================================================
// ================= PG =================
(data.soalPG || []).forEach((s, i) => {
let opsiHTML = "";

if (s.opsi) {
  Object.entries(s.opsi)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([k,v]) => {
      opsiHTML += `<div>${k}. ${v}</div>`;
    });
}

  listEl.innerHTML += `
  <div class="soal-box">
    <div class="soal-header">
      <span class="jenis">Pilihan Ganda</span>
      <button class="btn-edit" onclick="editSoal('soalPG', ${i})">✏️</button></div>
      <div class="nomor">Soal ${no++}</div>
      <div class="pertanyaan">${s.pertanyaan || ""}</div>
      <div class="opsi">${opsiHTML}</div>
      <small><b>Jawaban:</b> ${s.jawabanBenar || "-"}</small>
    </div>
  `;
});


// =====================================================
// ================= MCMA =================
(data.soalMCMA || []).forEach((s, i) => {
let opsiHTML = "";

if (s.opsi) {
  Object.entries(s.opsi)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([k,v]) => {
      opsiHTML += `<div>[ ] ${k}. ${v}</div>`;
    });
}

  listEl.innerHTML += `
  <div class="soal-box">
      <div class="soal-header">
      <span class="jenis" style="background:#f59e0b">PG Kompleks</span>
      <button class="btn-edit" onclick="editSoal('soalMCMA', ${i})">✏️</button></div>
      <div class="nomor">Soal ${no++}</div>
      <div class="pertanyaan">${s.pertanyaan || ""}</div>
      <div class="opsi">${opsiHTML}</div>
      <small><b>Jawaban:</b> ${(s.jawabanBenar || []).join(", ")}</small>
    </div>
  `;
});


// =====================================================
// ================= KATEGORI =================
(data.soalKategori || []).forEach((s, i) => {
  let pernyataanHTML = "";

  (s.pernyataan || []).forEach((p, i) => {
    pernyataanHTML += `
      <div>
        ${i + 1}. ${p.teks}
        <small>(Jawaban: ${p.jawabanBenar ? "Benar" : "Salah"})</small>
      </div>
    `;
  });

  listEl.innerHTML += `
  <div class="soal-box">
    <div class="soal-header">
      <span class="jenis" style="background:#8b5cf6">Kategori</span>
      <button class="btn-edit" onclick="editSoal('soalKategori', ${i})">✏️</button></div>
      <div class="nomor">Soal ${no++}</div>
      <div class="pertanyaan">${s.pertanyaan || ""}</div>
      <div class="opsi">${pernyataanHTML}</div>
    </div>
  `;
});


// =====================================================
// ================= ESSAY =================
(data.soalEssay || []).forEach((s, i) => {
  listEl.innerHTML += `
  <div class="soal-box">
    <div class="soal-header">
      <span class="jenis" style="background:#16a34a">Esai</span>
      <button class="btn-edit" onclick="editSoal('soalEssay', ${i})">✏️</button></div>
      <div class="nomor">Soal ${no++}</div>
      <div class="pertanyaan">${s.pertanyaan || ""}</div>
    </div>
  `;
});

    // RENDER MATHJAX
    if (window.MathJax) MathJax.typeset();

  } catch (err) {
    console.error(err);
    listEl.innerHTML = `
      <p style="color:red">
        ❌ Gagal memuat soal<br>
        ${err.message}
      </p>
    `;
  }
}


// ================= EDIT =================
window.editSoal = (jenis,index)=>{
  currentJenis = jenis;
  currentIndex = index;

  const soal = dataBank[jenis][index];

  renderEdit({
    tipe: jenis.replace("soal","").toLowerCase(),
    ...soal
  });

  document.getElementById("modalSoal").style.display="flex";
};

// ================= RENDER EDIT =================
function renderEdit(data){

  const c = document.getElementById("editContainer");
  c.innerHTML = "";

  const card = document.createElement("div");
  card.className = "soal-card";

  // ================= BASE =================
  let html = `
    <div class="tipe-label"></div>
    <div class="pertanyaan" contenteditable></div>
  `;

if(data.tipe === "pg"){
  html += `
    <div class="pg-options"></div>
    <select class="jawaban"></select>
    <button onclick="tambahOpsiPG()">+ Opsi</button>
  `;
}

window.tambahOpsiPG = () => {
  const box = document.querySelector(".pg-options");
  const jumlah = box.querySelectorAll(".opsi-row").length;

  const huruf = String.fromCharCode(65 + jumlah); // A, B, C...

  box.innerHTML += `
    <div class="opsi-row">
      <b>${huruf}.</b>
      <div class="opsi-text" contenteditable>Opsi baru</div>
    </div>
  `;

  // tambah juga ke dropdown jawaban
  const select = document.querySelector(".jawaban");
  select.innerHTML += `<option value="${huruf}">${huruf}</option>`;
};
window.hapusOpsiPG = (btn) => {
  const row = btn.parentElement;
  row.remove();

  const rows = document.querySelectorAll(".pg-options .opsi-row");
  const select = document.querySelector(".jawaban");

  select.innerHTML = "";

  rows.forEach((row, i) => {
    const huruf = String.fromCharCode(65 + i);
    row.querySelector("b").innerText = huruf + ".";
    select.innerHTML += `<option value="${huruf}">${huruf}</option>`;
  });
};

if(data.tipe === "mcma"){
  html += `
    <div class="mcma-options"></div>
    <button onclick="tambahOpsiMCMA()">+ Opsi</button>
  `;
}
window.tambahOpsiMCMA = () => {
  const box = document.querySelector(".mcma-options");
  const jumlah = box.querySelectorAll(".opsi-row").length;

  const huruf = String.fromCharCode(65 + jumlah);

  box.innerHTML += `
    <div class="opsi-row">
      <b>${huruf}.</b>
      <div class="opsi-text" contenteditable>Opsi baru</div>
      <input type="checkbox">
      <button onclick="hapusOpsiMCMA(this)">❌</button>
    </div>
  `;
};
window.hapusOpsiMCMA = (btn) => {
  btn.parentElement.remove();

  const rows = document.querySelectorAll(".mcma-options .opsi-row");

  rows.forEach((row, i) => {
    const huruf = String.fromCharCode(65 + i);
    row.querySelector("b").innerText = huruf + ".";
  });
};

  if(data.tipe === "kategori"){
    html += `
  <table class="kategori-table">
    <tr>
      <th>Pernyataan</th>
      <th>Benar</th>
      <th>Salah</th>
    </tr>
  </table>

  <button class="btn-tambah" onclick="tambahPernyataan()">+ Tambah Pernyataan</button>
`;
  }
window.tambahPernyataan = () => {
  const table = document.querySelector(".kategori-table");
  const index = table.querySelectorAll("tr").length - 1; // skip header

  table.innerHTML += `
    <tr>
      <td contenteditable>Pernyataan baru</td>
      <td>
        <input type="radio" name="kat${index}" value="true">
      </td>
      <td>
        <input type="radio" name="kat${index}" value="false" checked>
      </td>
      <td>
        <button onclick="this.closest('tr').remove()">❌</button>
      </td>
    </tr>
  `;
};
  card.innerHTML = html;
  c.appendChild(card);

  // ================= LABEL =================
  const label = card.querySelector(".tipe-label");

  const tipeMap = {
    pg:"Pilihan Ganda",
    mcma:"PG Kompleks",
    kategori:"Kategori",
    esai:"Essay"
  };

  label.innerText = tipeMap[data.tipe] || "Soal";

  // ================= PERTANYAAN =================
  card.querySelector(".pertanyaan").innerText = data.pertanyaan || "";

  // ================= PG =================
  if(data.tipe === "pg"){
    const box = card.querySelector(".pg-options");
    const kunci = card.querySelector(".jawaban");

    Object.entries(data.opsi || {})
  .sort(([a],[b]) => a.localeCompare(b))
  .forEach(([k,v])=>{
      box.innerHTML += `
        <div class="opsi-row">
          <b>${k}.</b>
          <div class="opsi-text" contenteditable>${v}</div>
        </div>
      `;

      kunci.innerHTML += `
        <option value="${k}" ${data.jawabanBenar==k?"selected":""}>${k}</option>
      `;
    });
  }

  // ================= MCMA =================
  if(data.tipe === "mcma"){
    const box = card.querySelector(".mcma-options");

    Object.entries(data.opsi || {})
  .sort(([a],[b]) => a.localeCompare(b))
  .forEach(([k,v])=>{
      const checked = (data.jawabanBenar || []).includes(k);

      box.innerHTML += `
        <div class="opsi-row">
          <b>${k}.</b>
          <div class="opsi-text" contenteditable>${v}</div>
          <input type="checkbox" ${checked?"checked":""}>
        </div>
      `;
    });
  }

  // ================= KATEGORI FIX =================
  if(data.tipe === "kategori"){
    const table = card.querySelector(".kategori-table");

    const list = data.pernyataan || [];

    if(list.length === 0){
      table.innerHTML += `
        <tr>
          <td colspan="3" style="color:red;text-align:center">
            ⚠️ Data kategori kosong
          </td>
        </tr>
      `;
    }

    list.forEach((p,i)=>{
      table.innerHTML += `
        <tr>
          <td contenteditable>${p.teks || ""}</td>
          <td>
            <input type="radio" name="kat${i}" value="true"
            ${p.jawabanBenar ? "checked" : ""}>
          </td>
          <td>
            <input type="radio" name="kat${i}" value="false"
            ${!p.jawabanBenar ? "checked" : ""}>
          </td>
        </tr>
      `;
    });
  }
}

// ================= SIMPAN =================
window.simpanSoal = async ()=>{

  const card = document.querySelector(".soal-card");

  const tipe = currentJenis.replace("soal","").toLowerCase();
  const pertanyaan = card.querySelector(".pertanyaan").innerText;

  let data = { pertanyaan };

  // ================= PG =================
  if(tipe==="pg"){
    const opsi={};

    card.querySelectorAll(".pg-options .opsi-row").forEach((row,i)=>{
      opsi[String.fromCharCode(65+i)] =
        row.querySelector(".opsi-text").innerText;
    });

    data.opsi = opsi;
    data.jawabanBenar = card.querySelector(".jawaban").value;
  }

  // ================= MCMA =================
  if(tipe==="mcma"){
    const opsi={},kunci=[];

    card.querySelectorAll(".mcma-options .opsi-row").forEach((row,i)=>{
      const key = String.fromCharCode(65+i);

      opsi[key] = row.querySelector(".opsi-text").innerText;

      if(row.querySelector("input").checked){
        kunci.push(key);
      }
    });

    data.opsi = opsi;
    data.jawabanBenar = kunci;
  }

  // ================= KATEGORI FIX =================
  if(tipe==="kategori"){
    const pernyataan=[];

    card.querySelectorAll(".kategori-table tr").forEach((row,i)=>{
      if(i===0) return; // header

      const teks = row.cells[0].innerText.trim();
      const radio = row.querySelector("input:checked");

      const benar = radio ? radio.value === "true" : false;

      if(teks){
        pernyataan.push({
          teks,
          jawabanBenar: benar
        });
      }
    });

    data.pernyataan = pernyataan;
  }

  dataBank[currentJenis][currentIndex] = data;

  await updateDoc(doc(db,"bank_soal",bankId),{
    [currentJenis]: dataBank[currentJenis]
  });

  tampilkanToast("✅ Berhasil diupdate");

  tutupModalSoal();
  loadSoal();
};
function tampilkanToast(pesan) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = pesan;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
// ================= CLOSE =================
window.tutupModalSoal = ()=>{
  document.getElementById("modalSoal").style.display="none";
};

window.onclick = (e)=>{
  const modal = document.getElementById("modalSoal");
  if(e.target===modal){
    modal.style.display="none";
  }
};

loadSoal();