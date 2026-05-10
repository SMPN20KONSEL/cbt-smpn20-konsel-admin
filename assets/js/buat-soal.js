// ======================================================
// ======================= FIREBASE =====================
// ======================================================
import { db, auth } from "./firebase.js"; // 🔥 tambah auth
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
const btnSimpan  = document.getElementById("btnSimpan");
const toastBox   = document.getElementById("toast");

const judulSelect = document.getElementById("judulSelect");
const judulManual = document.getElementById("judulManual");
const mapelInput = document.getElementById("mapelInput");
const kelasInput = document.getElementById("kelasInput");
judulSelect?.addEventListener("change", () => {
  if (judulSelect.value === "lainnya") {
    judulManual.style.display = "block";
  } else {
    judulManual.style.display = "none";
    judulManual.value = "";
  }
});

// ======================================================
// ======================== UTIL ========================
// ======================================================
function huruf(i){ return String.fromCharCode(65+i); }

function buatDocId(judul, mapel, kelas) {
  return `${judul}_${mapel}_${kelas}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
function toTitleCase(str){
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
const daftarMapelSMP = [
  "Pendidikan Agama Islam",
  "Pendidikan Agama Kristen",
  "Pendidikan Agama Katolik",
  "Pendidikan Agama Hindu",
  "Pendidikan Agama Buddha",
  "Pendidikan Agama Konghucu",

  "PPKn",
  "Bahasa Indonesia",
  "Matematika",
  "IPA",
  "IPS",
  "Bahasa Inggris",

  "Seni Budaya",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Prakarya",
  "Informatika",

  "Bahasa Daerah",
  "Muatan Lokal"
];
// isi dropdown mapel otomatis
daftarMapelSMP.forEach(mapel => {
  const opt = document.createElement("option");
  opt.value = mapel;
  opt.textContent = mapel;
  mapelInput.appendChild(opt);
});

const daftarKelas = [
  "VII",
  "VIII",
  "IX",
  "VII A",
  "VII B",
  "VIII A",
  "VIII B",
  "IX A",
  "IX B"
];

// isi dropdown kelas otomatis
daftarKelas.forEach(kelas => {
  const opt = document.createElement("option");
  opt.value = kelas;
  opt.textContent = kelas;
  kelasInput.appendChild(opt);
});

function reindexOpsi(container, kunciSelect = null, isMCMA = false){

  const rows = container.querySelectorAll(".opsi-row");

  // reset dropdown PG
  if(kunciSelect){
    kunciSelect.innerHTML = "";
  }

  rows.forEach((row, index)=>{
    const label = String.fromCharCode(65 + index);

    // ubah label huruf
    const b = row.querySelector("b");
    if(b) b.innerText = label + ".";

    // update checkbox MCMA
    const checkbox = row.querySelector("input[type='checkbox']");
    if(checkbox){
      checkbox.value = label;
    }

    // rebuild dropdown PG
    if(kunciSelect){
      const opt = document.createElement("option");
      opt.value = label;
      opt.textContent = label;
      kunciSelect.appendChild(opt);
    }
  });
}

function reindexKategori(table){

  const rows = table.querySelectorAll("tr");

  rows.forEach((row, index)=>{
    if(index === 0) return; // skip header

    const label = String.fromCharCode(97 + (index - 1)); // a, b, c

    const span = row.querySelector("span");
    if(span){
      span.innerText = span.innerText.replace(/^[a-z]\.\s*/i, "");
      span.innerText = `${label}. ${span.innerText.trim()}`;
    }
  });
}

// ======================================================
// ======================== TOAST =======================
// ======================================================
function toast(msg, type="success"){
  if(!toastBox) return;

  const div = document.createElement("div");
  div.className = `toast-${type}`;
  div.innerText = msg;

  toastBox.appendChild(div);
  setTimeout(()=>div.remove(),3000);
}


// ======================================================
// ======================= TEMPLATE =====================
// ======================================================
window.downloadTemplate = async () => {
  if (!window.docx) return alert("DOCX belum load!");

  const { Document, Packer, Paragraph } = window.docx;

  // helper spacing 1.5
  const sp15 = {
    spacing: { line: 360 } // 1.5 line (240 = 1.0)
  };

  const docFile = new Document({
    sections: [{
      children: [

        // ================= PG =================
        new Paragraph({ text: "SOAL PG", alignment: window.docx.AlignmentType.CENTER,
  ...sp15
}),
        new Paragraph({ text: "1. 2 + 2?", ...sp15 }),
        new Paragraph({ text: "A. 1", ...sp15 }),
        new Paragraph({ text: "B. 2", ...sp15 }),
        new Paragraph({ text: "C. 4", ...sp15 }),
        new Paragraph({ text: "D. 5", ...sp15 }),
        new Paragraph({ text: "KUNCI: C", ...sp15 }),

        new Paragraph({ text: "", ...sp15 }),

        // ================= MCMA =================
        new Paragraph({ text: "SOAL MCMA", alignment: window.docx.AlignmentType.CENTER,
  ...sp15
}),
        new Paragraph({ text: "2. Pilih yang benar", ...sp15 }),
        new Paragraph({ text: "A. 2 genap", ...sp15 }),
        new Paragraph({ text: "B. 3 genap", ...sp15 }),
        new Paragraph({ text: "C. 4 genap", ...sp15 }),
        new Paragraph({ text: "D. 5 genap", ...sp15 }),
        new Paragraph({ text: "KUNCI: A, C", ...sp15 }),

        new Paragraph({ text: "", ...sp15 }),

// ================= KATEGORI =================
new Paragraph({
  text: "SOAL KATEGORI",
  alignment: window.docx.AlignmentType.CENTER,
  ...sp15
}),

new Paragraph({ text: "3. Tentukan benar/salah", ...sp15 }),

new Paragraph({ text: "a. 2+2=4   (Benar)", ...sp15 }),
new Paragraph({ text: "b. 5x2=20   (Salah)", ...sp15 }),
new Paragraph({ text: "", ...sp15 }),

        // ================= ESAI =================
        new Paragraph({ text: "SOAL ESAI", alignment: window.docx.AlignmentType.CENTER,...sp15}),
        new Paragraph({ text: "4. Jelaskan...", ...sp15 }),

      ]
    }]
  });

  const blob = await Packer.toBlob(docFile);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Soal_Rapi.docx";
  a.click();

  URL.revokeObjectURL(url);
};


// ======================================================
// ======================== IMPORT ======================
// ======================================================
document.getElementById("fileImport")?.addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  if(!window.mammoth){
    alert("Library mammoth belum load!");
    return;
  }

  const reader = new FileReader();

  reader.onload = async function(event){
    const result = await window.mammoth.convertToHtml({
      arrayBuffer: event.target.result
    });

    parseSoalHtml(result.value);
    toast("✅ Import berhasil");
  };

  reader.readAsArrayBuffer(file);
});


// ======================================================
// ===================== PARSER =========================
// ======================================================
function parseSoalHtml(html){
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // ================= NORMALIZE =================
  let rawLines = Array.from(temp.querySelectorAll("p"))
    .map(p => p.innerText.trim())
    .filter(x => x);

  const lines = [];

  rawLines.forEach(line=>{
    let split = line
      .replace(/(^|\s)([A-Z][\.\)\-])/g, '\n$2')
      .split('\n')
      .map(x => x.trim())
      .filter(x => x);

    lines.push(...split);
  });

  let soal = null;
  let currentTipe = "esai";

  lines.forEach(line=>{

    // ================= DETEKSI HEADER TIPE =================
    if(/SOAL\s*PG/i.test(line) && !/KOMPLEKS|MCMA/i.test(line)){
      currentTipe = "pg";
      return;
    }

    if(/SOAL\s*(PG KOMPLEKS|MCMA)/i.test(line)){
      currentTipe = "mcma";
      return;
    }

    if(/SOAL\s*KATEGORI/i.test(line)){
      currentTipe = "kategori";
      return;
    }

    if(/SOAL\s*ESA|SOAL\s*ESAI/i.test(line)){
      currentTipe = "esai";
      return;
    }

    // ================= SOAL BARU =================
    if(/^\d+[\.\)\-]/.test(line)){
      if(soal) finalizeSoal(soal);

      soal = {
        tipe: currentTipe,
        pertanyaan: line.replace(/^\d+[\.\)\-]\s*/,""),
        opsi: {},
        jawabanBenar: [],
        pernyataan: []
      };

      return;
    }

    if(!soal) return;

    // ================= OPSI =================
    let opsi = line.match(/^([A-Z])\.\s*(.*)/);

    if(opsi){
      const key = opsi[1].toUpperCase();
      soal.opsi[key] = opsi[2];

      // auto PG kalau belum jelas
      if(soal.tipe === "esai"){
        soal.tipe = "pg";
      }

      return;
    }

    // ================= KUNCI =================
    if(/(KUNCI|JAWABAN)/i.test(line)){
      let kunci = line
        .replace(/(KUNCI|JAWABAN)(\s*JAWABAN)?\s*:/i,"")
        .trim();

      soal.jawabanBenar = kunci
        .split(/[^A-Z]+/)
        .map(x => x.trim().toUpperCase())
        .filter(x => x);

      return;
    }

    // ================= KATEGORI (FIX UTAMA) =================
    let kat = line.match(/^([a-z])\.\s*(.*?)\s*\((benar|salah)\)/i);

    if(kat){
      soal.tipe = "kategori";

      soal.pernyataan.push({
        teks: kat[2], // ✅ FIX: sebelumnya salah (kat[1])
        jawabanBenar: kat[3].toLowerCase() === "benar"
      });

      return;
    }

    // ================= FILTER SAMPAH =================
    if(/^(Catatan|Pembahasan)/i.test(line)){
      return;
    }

    // ================= LANJUT PERTANYAAN =================
    soal.pertanyaan += " " + line;
  });

  if(soal) finalizeSoal(soal);

  // ================= FINAL CHECK =================
  function finalizeSoal(s){

    // 🔥 PRIORITAS: KATEGORI HARUS PALING ATAS
    if(s.pernyataan && s.pernyataan.length > 0){
      s.tipe = "kategori";
    }

    // MCMA DETEKSI
    if(s.tipe === "pg" && s.jawabanBenar.length > 1){
      s.tipe = "mcma";
    }

    // ESAI fallback
    if(
      (!s.opsi || Object.keys(s.opsi).length === 0) &&
      (!s.pernyataan || s.pernyataan.length === 0)
    ){
      s.tipe = "esai";
    }

    s.pertanyaan = s.pertanyaan.trim();

    renderSoal(s);
  }
}

// ======================================================
// ===================== RENDER =========================
// ======================================================
function renderSoal(data){

  tambahSoal();
  const card = daftarSoal.lastElementChild;

  const tipe = card.querySelector(".tipe-soal");
  const pertanyaan = card.querySelector(".pertanyaan");

  tipe.value = data.tipe;
  pertanyaan.innerText = data.pertanyaan;
  tipe.dispatchEvent(new Event("change"));

  // ===== PG =====
  if(data.tipe === "pg"){
    const box = card.querySelector(".pg-options");
    const kunci = card.querySelector(".jawaban");

    box.innerHTML = "";
    kunci.innerHTML = "";

    Object.entries(data.opsi).forEach(([key,val])=>{
      const row = document.createElement("div");
      row.className = "opsi-row";

      row.innerHTML = `
        <b>${key}.</b>
        <div class="opsi-text" contenteditable>${val}</div>
      `;

      box.appendChild(row);

      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = key;
      kunci.appendChild(opt);
    });

    kunci.value = data.jawabanBenar[0] || "";
  }

  // ===== MCMA =====
  else if(data.tipe === "mcma"){
    const box = card.querySelector(".mcma-options");
    box.innerHTML = "";

    Object.entries(data.opsi).forEach(([key,val])=>{
const checked = data.jawabanBenar
  .map(x => x.trim().toUpperCase())
  .includes(key.toUpperCase());
      const row = document.createElement("div");
      row.className = "opsi-row";

row.innerHTML = `
  <div class="opsi-kiri">
    <b>${key}.</b>
    <div class="opsi-text" contenteditable>${val}</div>
  </div>

  <div class="opsi-kanan">
    <input type="checkbox" value="${key}" ${checked ? "checked" : ""}>
    <button class="hapus-opsi">✖</button>
  </div>
`;

      box.appendChild(row);
    });
  }

  // ===== KATEGORI =====
else if(data.tipe === "kategori"){
  const table = card.querySelector(".kategori-table");

  table.innerHTML = `
    <tr>
      <th>Pernyataan</th>
      <th>Jawaban</th>
    </tr>
  `;

  data.pernyataan.forEach((p)=>{

    const tr = document.createElement("tr");

    const nilai = (p.jawabanBenar === true || p.jawabanBenar === "benar");

    tr.innerHTML = `
      <td class="kolom-kiri">
        <span contenteditable>${p.teks}</span>
      </td>

      <td class="kolom-kanan">
        <div class="jawaban-wrapper">
          <select class="jawaban-kategori">
            <option value="true" ${nilai ? "selected" : ""}>Benar</option>
            <option value="false" ${!nilai ? "selected" : ""}>Salah</option>
          </select>

          <button class="hapus-kategori">✖</button>
        </div>
      </td>
    `;

    const table = card.querySelector(".kategori-table");

tr.querySelector("button").onclick = ()=>{
  tr.remove();
  reindexKategori(table);
};
    table.appendChild(tr);
    
  });
}
}


// ======================================================
// ===================== TAMBAH SOAL ====================
// ======================================================
window.tambahSoal = () => {

  const id = Date.now();

  const card = document.createElement("div");
  card.className = "soal-card";

  card.innerHTML = `
<select class="tipe-soal">
  <option value="pg">Pilihan Ganda</option>
  <option value="mcma">PG Kompleks</option>
  <option value="kategori">Kategori</option>
  <option value="esai">Esai</option>
</select>

<div class="pertanyaan" contenteditable></div>

<div class="pg-options opsi-container"></div>
<button class="btn-add-opsi">+ Opsi</button>
<select class="jawaban"></select>

<div class="mcma-options opsi-container" style="display:none"></div>
<button class="btn-add-opsi-mcma" style="display:none">+ Opsi</button>

<div class="kategori-options" style="display:none">
  <table class="kategori-table">
    <tr>
      <th style="text-align:left">Pernyataan</th>
      <th style="text-align:left">Benar / Salah</th>
    </tr>
  </table>
</div>
<button class="btn-add-kategori" style="display:none">+ Pernyataan</button>

<div class="soal-actions">
  <button onclick="tambahSoal()">➕ Tambah</button>
  <button class="hapus">🗑 Hapus</button>
</div>
`;

  daftarSoal.appendChild(card);

  const tipe = card.querySelector(".tipe-soal");
  const pgBox = card.querySelector(".pg-options");
  const mcmaBox = card.querySelector(".mcma-options");
  const katTable = card.querySelector(".kategori-table");

  const btnAddPG = card.querySelector(".btn-add-opsi");
  const btnAddMCMA = card.querySelector(".btn-add-opsi-mcma");
  const btnAddKat = card.querySelector(".btn-add-kategori");

  const kunciSelect = card.querySelector(".jawaban");

  function tambahOpsi(container, isMCMA=false){
  const i = container.children.length;
  const label = huruf(i);

  const row = document.createElement("div");
  row.className = "opsi-row";

  row.innerHTML = `
    <div class="opsi-kiri">
      <b>${label}.</b>
      <div class="opsi-text" contenteditable data-placeholder="Tulis opsi..."></div>
    </div>

    <div class="opsi-kanan">
      ${isMCMA ? `<input type="checkbox" value="${label}">` : ""}
      <button class="hapus-opsi">✖</button>
    </div>
  `;

  container.appendChild(row);

  if(!isMCMA){
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    kunciSelect.appendChild(opt);
  }

  row.querySelector(".hapus-opsi").onclick = ()=>{

  row.remove();

  // PG
  if(container.classList.contains("pg-options")){
    reindexOpsi(container, kunciSelect, false);
  }

  // MCMA
  else if(container.classList.contains("mcma-options")){
    reindexOpsi(container, null, true);
  }

};
}

function tambahKategori(table){

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td class="kolom-kiri">
      <span contenteditable data-placeholder="Tulis pernyataan..."></span>
    </td>

    <td class="kolom-kanan">
      <div class="jawaban-wrapper">
        <select class="jawaban-kategori">
          <option value="true">Benar</option>
          <option value="false">Salah</option>
        </select>

        <button type="button">✖</button>
      </div>
    </td>
  `;

  table.appendChild(tr);

  tr.querySelector("button").onclick = () => {
    tr.remove();
    reindexKategori(table);
  };

  reindexKategori(table);
}

for(let i=0;i<4;i++){
  tambahOpsi(pgBox);
  tambahOpsi(mcmaBox,true);
}

for(let i=0;i<2;i++){
  tambahKategori(katTable);
}

btnAddPG.onclick = ()=>{
  tambahOpsi(pgBox);
  reindexOpsi(pgBox, kunciSelect, false);
};

btnAddMCMA.onclick = ()=>{
  tambahOpsi(mcmaBox,true);
  reindexOpsi(mcmaBox, null, true);
};

btnAddKat.onclick = ()=>{
  tambahKategori(katTable);
  reindexKategori(katTable);
};

card.querySelector(".hapus").onclick = ()=>card.remove();

const katWrapper = card.querySelector(".kategori-options");

tipe.onchange = ()=>{
  pgBox.style.display = tipe.value==="pg"?"block":"none";
  mcmaBox.style.display = tipe.value==="mcma"?"block":"none";
  katWrapper.style.display = tipe.value==="kategori"?"block":"none";

  btnAddPG.style.display = tipe.value==="pg"?"inline":"none";
  btnAddMCMA.style.display = tipe.value==="mcma"?"inline":"none";
  btnAddKat.style.display = tipe.value==="kategori"?"inline":"none";

  kunciSelect.style.display = tipe.value==="pg" ? "" : "none";
};
};

// ======================================================
// ===================== SIMPAN =========================
// ======================================================
window.simpanSemua = async ()=>{
  try{
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User belum login");
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Data user tidak ditemukan");
    }

    const dataUser = userSnap.data();

    if (!dataUser.nama) {
      throw new Error("Nama guru tidak ditemukan");
    }

    const namaGuru = dataUser.nama;

    // ===== JUDUL =====
    let judul = "";

    if (judulSelect.value === "lainnya") {
      judul = toTitleCase(judulManual.value.trim());

      if (!judul) {
        throw new Error("Judul manual harus diisi");
      }

    } else {
      judul = judulSelect.value;
    }

    // ===== MAPEL =====
    const mapel = mapelInput.value.trim();
    const kelas = kelasInput.value.trim();

    if (!judul || !mapel || !kelas) {
      throw new Error("Data wajib diisi");
    }

    const soalPG = [];
    const soalMCMA = [];
    const soalKategori = [];
    const soalEssay = [];

    document.querySelectorAll(".soal-card").forEach(card=>{
      const tipe = card.querySelector(".tipe-soal").value;
      const pertanyaan = card.querySelector(".pertanyaan").innerText.trim();

      if(!pertanyaan) return;

      if(tipe==="pg"){
        const opsi={};

        card.querySelectorAll(".pg-options .opsi-row").forEach(row=>{
          const key = row.querySelector("b").innerText.replace(".","");
          const val = row.querySelector(".opsi-text").innerText.trim();
          opsi[key] = val;
        });

        soalPG.push({
          pertanyaan,
          opsi,
          jawabanBenar: card.querySelector(".jawaban").value
        });
      }

      else if(tipe==="mcma"){
        const opsi={}, kunci=[];

        card.querySelectorAll(".mcma-options .opsi-row").forEach(row=>{
          const key = row.querySelector("b").innerText.replace(".","");
          const val = row.querySelector(".opsi-text").innerText.trim();
          opsi[key] = val;
        });

        card.querySelectorAll(".mcma-options input:checked").forEach(cb=>{
          kunci.push(cb.value);
        });

        if(kunci.length===0){
          throw new Error("MCMA wajib ada kunci");
        }

        soalMCMA.push({
          pertanyaan,
          opsi,
          jawabanBenar: kunci
        });
      }

      else if(tipe==="kategori"){
        const pernyataan=[];

        card.querySelectorAll(".kategori-table tr").forEach((row,i)=>{
          if(i===0) return;

          const teks = row.querySelector("span")?.innerText.trim();
          const select = row.querySelector(".jawaban-kategori");

          if(teks){
            pernyataan.push({
              teks,
              jawabanBenar: select?.value === "true"
            });
          }
        });

        soalKategori.push({
          pertanyaan,
          pernyataan
        });
      }

      else{
        soalEssay.push({ pertanyaan });
      }
    });

    // ================= 🔥 VALIDASI WAJIB (INI YANG DITAMBAHKAN) =================
    const totalSoal =
      soalPG.length +
      soalMCMA.length +
      soalKategori.length +
      soalEssay.length;

    if(totalSoal === 0){
      throw new Error("Tidak ada soal untuk disimpan");
    }

    // ================= SIMPAN =================
    const docId = `${buatDocId(judul, mapel, kelas)}_${Date.now()}`;

    await setDoc(doc(db,"bank_soal",docId),{
      judul,
      mapel,
      kelas,

      soalPG,
      soalMCMA,
      soalKategori,
      soalEssay,

      guruId: user.uid,
      namaGuru,

      dibuat: serverTimestamp()
    });

    toast("✅ Berhasil simpan");

    // ================= RESET =================
    daftarSoal.innerHTML = "";

    judulSelect.value = "";
    judulManual.value = "";
    mapelInput.value = "";
    kelasInput.value = "";

    judulManual.style.display = "none";

  }catch(err){
    toast("❌ "+err.message,"error");
  }
};

// ======================================================
// ===================== EVENT ==========================
// ======================================================
btnSimpan?.addEventListener("click",e=>{
  e.preventDefault();
  simpanSemua();
});