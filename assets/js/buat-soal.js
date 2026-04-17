// ======================================================
// ======================= FIREBASE =====================
// ======================================================
import { db, auth } from "./firebase.js";
import {
  doc,
  getDoc,
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
const mapelInput  = document.getElementById("mapelInput");
const kelasInput  = document.getElementById("kelasInput");

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

function generateId(prefix){
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
}

function buatDocId(judul, mapel, kelas) {
  return `${judul}_${mapel}_${kelas}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function toTitleCase(str){
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}


// ======================================================
// ===================== MAPEL AUTO =====================
// ======================================================
const daftarMapelSMP = [/* tetap sama */];

mapelInput.innerHTML = "<option value=''>Pilih Mapel</option>";
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
          <input type="checkbox" value="${key}" ${checked ? "checked":""}>
          <button class="hapus-opsi">✖</button>
        </div>
      `;

      box.appendChild(row);
    });
  }

  // ===== KATEGORI (FIX BUG) =====
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
        <td><button>✖</button></td>
      `;

      tr.querySelector("button").onclick = ()=>tr.remove();
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

  card.innerHTML = `...`; // tetap sama (tidak dihapus)

  daftarSoal.appendChild(card);

  const pgBox = card.querySelector(".pg-options");
  const mcmaBox = card.querySelector(".mcma-options");
  const katTable = card.querySelector(".kategori-table");
  const kunciSelect = card.querySelector(".jawaban");

  // ===== FIX LABEL =====
  function refreshLabel(container){
    container.querySelectorAll(".opsi-row").forEach((row,i)=>{
      row.querySelector("b").innerText = huruf(i)+".";
    });
  }

  function tambahOpsi(container, isMCMA=false){
    const label = huruf(container.querySelectorAll(".opsi-row").length);

    const row = document.createElement("div");
    row.className = "opsi-row";

    row.innerHTML = `
      <div class="opsi-kiri">
        <b>${label}.</b>
        <div class="opsi-text" contenteditable></div>
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
      refreshLabel(container);
    };
  }

  function tambahKategori(){
    const name = "kat_"+id+"_"+katTable.rows.length;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><span contenteditable></span></td>
      <td><input type="radio" name="${name}" value="true"></td>
      <td><input type="radio" name="${name}" value="false"></td>
      <td><button>✖</button></td>
    `;

    tr.querySelector("button").onclick = ()=>tr.remove();
    katTable.appendChild(tr);
  }

  for(let i=0;i<4;i++){
    tambahOpsi(pgBox);
    tambahOpsi(mcmaBox,true);
  }

  for(let i=0;i<2;i++) tambahKategori();
};


// ======================================================
// ===================== SIMPAN =========================
// ======================================================
window.simpanSemua = async ()=>{
  try{
    const user = auth.currentUser;
    if (!user) throw new Error("User belum login");

    let judul = judulSelect.value === "lainnya"
      ? toTitleCase(judulManual.value.trim())
      : judulSelect.value;

    if (!judul) throw new Error("Judul harus diisi");

    const mapel = mapelInput.value.trim();
    const kelas = kelasInput.value.trim().toUpperCase();

    if(!mapel || !kelas) throw new Error("Data wajib diisi");

    const soalPG=[], soalMCMA=[], soalKategori=[], soalEssay=[];

    document.querySelectorAll(".soal-card").forEach(card=>{
      const tipe = card.querySelector(".tipe-soal").value;
      const pertanyaan = card.querySelector(".pertanyaan").innerText.trim();

      if(!pertanyaan) return;

      // ===== PG =====
      if(tipe==="pg"){
        const opsi={};

        card.querySelectorAll(".pg-options .opsi-text").forEach((o,i)=>{
          const text = o.innerText.trim();
          if(text) opsi[huruf(i)] = text;
        });

        if(Object.keys(opsi).length < 2)
          throw new Error("PG minimal 2 opsi");

        const kunci = card.querySelector(".jawaban").value;
        if(!kunci) throw new Error("PG harus punya jawaban benar");

        soalPG.push({ id: generateId("pg"), pertanyaan, opsi, jawabanBenar:kunci });
      }

      // ===== MCMA =====
      else if(tipe==="mcma"){
        const opsi={}, kunci=[];

        card.querySelectorAll(".mcma-options .opsi-text").forEach((o,i)=>{
          const text = o.innerText.trim();
          if(text) opsi[huruf(i)] = text;
        });

        if(Object.keys(opsi).length < 2)
          throw new Error("MCMA minimal 2 opsi");

        card.querySelectorAll(".mcma-options input:checked").forEach(cb=>{
          if(opsi[cb.value]) kunci.push(cb.value);
        });

        if(kunci.length===0)
          throw new Error("MCMA wajib ada kunci");

        soalMCMA.push({ id: generateId("mcma"), pertanyaan, opsi, jawabanBenar:kunci });
      }

      // ===== KATEGORI =====
      else if(tipe==="kategori"){
        const pernyataan=[];

        card.querySelectorAll(".kategori-table tr").forEach((row,i)=>{
          if(i===0) return;

          const teks = row.querySelector("span")?.innerText.trim();
          const checked = row.querySelector("input:checked");

          if(!checked) throw new Error("Semua kategori harus dipilih");

          if(teks){
            pernyataan.push({
              teks,
              jawabanBenar: checked.value==="true"
            });
          }
        });

        if(pernyataan.length===0)
          throw new Error("Kategori minimal 1");

        soalKategori.push({ id: generateId("kat"), pertanyaan, pernyataan });
      }

      // ===== ESSAY =====
      else{
        if(pertanyaan.length < 5)
          throw new Error("Essay terlalu pendek");

        soalEssay.push({ id: generateId("essay"), pertanyaan });
      }
    });

    const docId = buatDocId(judul,mapel,kelas);
    const ref = doc(db,"bank_soal",docId);

    const snap = await getDoc(ref);
    if(snap.exists() && !confirm("Timpa data?")) return;

    await setDoc(ref,{
      judul, mapel, kelas,
      soalPG, soalMCMA, soalKategori, soalEssay,
      guruId: user.uid,
      namaGuru: user.email,
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