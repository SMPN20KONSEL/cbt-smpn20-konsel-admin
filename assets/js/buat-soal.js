// ======================================================
// ======================= FIREBASE =====================
// ======================================================
import { db, auth } from "./firebase.js"; // 🔥 tambah auth
import {
  doc,
  setDoc,
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

  const docFile = new Document({
  sections: [{
    children: [

      new Paragraph("SOAL PG"),
      new Paragraph("1. 2 + 2?"),
      new Paragraph("A. 1"),
      new Paragraph("B. 2"),
      new Paragraph("C. 4"),
      new Paragraph("D. 5"),
      new Paragraph("KUNCI: C"),

      new Paragraph("SOAL MCMA"),
      new Paragraph("2. Pilih yang benar"),
      new Paragraph("A. 2 genap"),
      new Paragraph("B. 3 genap"),
      new Paragraph("C. 4 genap"),
      new Paragraph("D. 5 genap"),
      new Paragraph("KUNCI: A, C"),

      new Paragraph("SOAL KATEGORI"),
      new Paragraph("3. Tentukan benar/salah"),
      new Paragraph("a. 2+2=4 (Benar)"),
      new Paragraph("b. 5x2=20 (Salah)"),
      
      new Paragraph("SOAL ESAI"),
      new Paragraph("4. Jelaskan..."),
     ]
    }]
  });

  const blob = await Packer.toBlob(docFile);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Soal.docx";
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
      // pecah opsi (lebih aman)
      .replace(/(^|\s)([A-D]\.)/g, '\n$2')
      .split('\n')
      .map(x=>x.trim())
      .filter(x=>x);

    lines.push(...split);
  });

  let soal = null;
  let currentTipe = "esai";

  lines.forEach(line=>{

    // ================= DETEKSI TIPE GLOBAL =================
    if(/SOAL\s*(PG KOMPLEKS|MCMA)/i.test(line)){
      currentTipe = "mcma";
      return;
    }
    else if(/SOAL KATEGORI/i.test(line)){
      currentTipe="kategori";
      return;
    }
    else if(/SOAL ESAI/i.test(line)){
      currentTipe="esai";
      return;
    }
    else if(/SOAL\s*PG/i.test(line)){
      currentTipe = "pg";
      return;
    }

    // ================= SOAL BARU =================
    if(/^\d+[\.\)\-]/.test(line)){
      if(soal) finalizeSoal(soal);

      soal = {
        tipe: currentTipe,
        pertanyaan: line.replace(/^\d+[\.\)\-]\s*/,""),
        opsi:{},
        jawabanBenar:[],
        pernyataan:[]
      };
      return;
    }

    if(!soal) return;

    // ================= OPSI =================
    let opsi = line.match(/^([A-D])\.\s*(.*)/);
    if(opsi){
      soal.opsi[opsi[1]] = opsi[2];

      // auto detect PG
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
        .split(/[^A-D]+/)
        .map(x => x.trim().toUpperCase())
        .filter(x => x);

      return;
    }

    // ================= KATEGORI =================
    let kat = line.match(/^[a-z]\.\s*(.*?)\s*\((Benar|Salah)\)/i);
    if(kat){
      soal.tipe = "kategori";
      soal.pernyataan.push({
        teks: kat[1],
        jawabanBenar: kat[2].toLowerCase()==="benar"
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

    // PG → MCMA
    if(s.tipe === "pg" && s.jawabanBenar.length > 1){
      s.tipe = "mcma";
    }

    // kalau tidak ada opsi & kategori → esai
    if(Object.keys(s.opsi).length === 0 && s.pernyataan.length === 0){
      s.tipe = "esai";
    }

    // bersihin pertanyaan
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
        <th>Benar</th>
        <th>Salah</th>
        <th></th>
      </tr>
    `;

    data.pernyataan.forEach((p,i)=>{
      const name = "kat_"+Date.now()+"_"+i;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><span contenteditable>${p.teks}</span></td>
        <td><input type="radio" name="${name}" value="true" ${p.jawabanBenar ? "checked":""}></td>
        <td><input type="radio" name="${name}" value="false" ${!p.jawabanBenar ? "checked":""}></td>
        <td></td>
      `;

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
      <th>Pernyataan</th>
      <th>Benar</th>
      <th>Salah</th>
      <th></th>
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

  row.querySelector(".hapus-opsi").onclick = ()=>row.remove();
}

  function tambahKategori(){
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><span contenteditable></span></td>
      <td><input type="radio" name="kat_${id}_${Date.now()}" value="true"></td>
      <td><input type="radio" name="kat_${id}_${Date.now()}" value="false"></td>
      <td><button>✖</button></td>
    `;

    tr.querySelector("button").onclick=()=>tr.remove();
    katTable.appendChild(tr);
  }

  for(let i=0;i<4;i++){
    tambahOpsi(pgBox);
    tambahOpsi(mcmaBox,true);
  }

  for(let i=0;i<2;i++) tambahKategori();

  btnAddPG.onclick = ()=>tambahOpsi(pgBox);
  btnAddMCMA.onclick = ()=>tambahOpsi(mcmaBox,true);
  btnAddKat.onclick = ()=>tambahKategori();

  card.querySelector(".hapus").onclick = ()=>card.remove();

  tipe.onchange = ()=>{
    pgBox.style.display = tipe.value==="pg"?"block":"none";
    mcmaBox.style.display = tipe.value==="mcma"?"block":"none";
    katTable.parentElement.style.display = tipe.value==="kategori"?"block":"none";

    btnAddPG.style.display = tipe.value==="pg"?"inline":"none";
    btnAddMCMA.style.display = tipe.value==="mcma"?"inline":"none";
    btnAddKat.style.display = tipe.value==="kategori"?"inline":"none";

    kunciSelect.style.display = tipe.value==="pg"?"block":"none";
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
    // ===== JUDUL =====
let judul = "";

if (judulSelect.value === "lainnya") {
  judul = toTitleCase(judulManual.value.trim());
} else {
  judul = judulSelect.value;
}
if (judulSelect.value === "lainnya" && !judul) {
  throw new Error("Judul manual harus diisi");
}
// ===== MAPEL =====
const mapel = mapelInput.value.trim();

// ===== KELAS (AUTO HURUF BESAR) =====
const kelas = kelasInput.value.trim().toUpperCase();

    if(!judul||!mapel||!kelas){
      throw new Error("Data wajib diisi");
    }

    const soalPG=[], soalMCMA=[], soalKategori=[], soalEssay=[];

    document.querySelectorAll(".soal-card").forEach(card=>{
      const tipe = card.querySelector(".tipe-soal").value;
      const pertanyaan = card.querySelector(".pertanyaan").innerText.trim();

      if(!pertanyaan) return;

      if(tipe==="pg"){
        const opsi={};

        card.querySelectorAll(".pg-options .opsi-text").forEach((o,i)=>{
          opsi[huruf(i)] = o.innerText.trim();
        });

        soalPG.push({
          pertanyaan,
          opsi,
          jawabanBenar: card.querySelector(".jawaban").value
        });
      }

      else if(tipe==="mcma"){
        const opsi={}, kunci=[];

        card.querySelectorAll(".mcma-options .opsi-text").forEach((o,i)=>{
          opsi[huruf(i)] = o.innerText.trim();
        });

        card.querySelectorAll(".mcma-options input:checked").forEach(cb=>{
          kunci.push(cb.value);
        });

        if(kunci.length===0){
          throw new Error("MCMA wajib ada kunci");
        }

        soalMCMA.push({ pertanyaan, opsi, jawabanBenar:kunci });
      }

      else if(tipe==="kategori"){
        const pernyataan=[];

        card.querySelectorAll(".kategori-table tr").forEach((row,i)=>{
          if(i===0) return;

          const teks = row.querySelector("span")?.innerText.trim();
          const checked = row.querySelector("input:checked");

          if(teks){
            pernyataan.push({
              teks,
              jawabanBenar: checked?.value === "true"
            });
          }
        });

        soalKategori.push({ pertanyaan, pernyataan });
      }

      else{
        soalEssay.push({ pertanyaan });
      }
    });

    const docId = buatDocId(judul,mapel,kelas);

await setDoc(doc(db,"bank_soal",docId),{
  judul,
  mapel,
  kelas,

  soalPG,
  soalMCMA,
  soalKategori,
  soalEssay,

  guruId: user.uid,
  namaGuru: user.email, // 👍 biar bisa tampil nanti

  dibuat: serverTimestamp()
});

    toast("✅ Berhasil simpan");

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