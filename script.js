/* ====== ISI URL WEB APP APPS SCRIPT DI BAWAH INI ====== */
const API_URL = "https://script.google.com/macros/s/AKfycby5wS4X4G8nSxeBX6eVCK_SAWoIHibqYiTifTRQuB6PtxqDQvc9Ca91XoWHdr5yvz9fgw/exec";
/* ====================================================== */

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"];

// State
let tanggalAktif = new Date();          // bulan yang sedang ditampilkan
let petaEvent = {};                     // "YYYY-MM-DD" -> [event, event, ...]

// Elemen
const elLabelBulan = document.getElementById("label-bulan");
const elGrid       = document.getElementById("grid-tanggal");
const elStatus     = document.getElementById("kotak-status");

// ---------- Helper ----------
function dua(n) { return n < 10 ? "0" + n : "" + n; }

function keTeksTanggal(d) {
  return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate());
}

function tampilStatus(pesan, isError) {
  elStatus.textContent = pesan;
  elStatus.className = "kotak-status" + (isError ? " error" : "");
}

function sembunyikanStatus() {
  elStatus.className = "kotak-status sembunyi";
}

// ---------- Bangun peta tanggal -> event (dukung event multi-hari) ----------
function bangunPetaEvent(events) {
  const peta = {};

  events.forEach(function (ev) {
    const mulai = ev.tanggal_mulai_event;
    if (!mulai) return;

    let selesai = ev.tanggal_selesai_event || mulai;
    if (selesai < mulai) selesai = mulai;   // aman: string YYYY-MM-DD bisa dibanding langsung

    const bagian = mulai.split("-");
    const kursor = new Date(Number(bagian[0]), Number(bagian[1]) - 1, Number(bagian[2]));

    let pengaman = 0;
    while (pengaman < 400) {
      const kunci = keTeksTanggal(kursor);
      if (kunci > selesai) break;

      if (!peta[kunci]) peta[kunci] = [];
      peta[kunci].push(ev);

      if (kunci === selesai) break;
      kursor.setDate(kursor.getDate() + 1);
      pengaman++;
    }
  });

  return peta;
}

// ---------- Render kalender ----------
function renderKalender() {
  const tahun = tanggalAktif.getFullYear();
  const bulan = tanggalAktif.getMonth();

  elLabelBulan.textContent = NAMA_BULAN[bulan] + " " + tahun;

  const hariPertama = new Date(tahun, bulan, 1).getDay();   // 0 = Minggu
  const jumlahHari  = new Date(tahun, bulan + 1, 0).getDate();
  const teksHariIni = keTeksTanggal(new Date());

  let html = "";

  // Sel kosong sebelum tanggal 1
  for (let i = 0; i < hariPertama; i++) {
    html += '<div class="sel kosong"></div>';
  }

  // Sel tanggal
  for (let tgl = 1; tgl <= jumlahHari; tgl++) {
    const kunci = tahun + "-" + dua(bulan + 1) + "-" + dua(tgl);
    const daftar = petaEvent[kunci] || [];

    let kelas = "sel";
    if (daftar.length > 0) kelas += " ada-event";
    if (kunci === teksHariIni) kelas += " hari-ini";

    html += '<div class="' + kelas + '" data-tanggal="' + kunci + '">';
    html += '<div class="angka-tanggal">' + tgl + '</div>';

    daftar.slice(0, 2).forEach(function (ev) {
      html += '<div class="chip-event">' + amanTeks(ev.nama_event) + '</div>';
    });
    if (daftar.length > 2) {
      html += '<div class="lebih-event">+' + (daftar.length - 2) + ' lainnya</div>';
    }

    html += '</div>';
  }

  elGrid.innerHTML = html;
}

// Cegah karakter HTML di nama event merusak tampilan
function amanTeks(nilai) {
  return String(nilai || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- Ambil data dari API ----------
async function muatData() {
  if (API_URL.indexOf("PASTE_URL") === 0) {
    tampilStatus("URL API belum diisi. Buka file script.js dan isi konstanta API_URL di baris paling atas.", true);
    renderKalender();
    return;
  }

  tampilStatus("Memuat data event...", false);

  try {
    const respon = await fetch(API_URL);
    if (!respon.ok) throw new Error("HTTP " + respon.status);

    const data = await respon.json();
    if (data.status !== "ok") throw new Error(data.message || "API mengembalikan status error");

    petaEvent = bangunPetaEvent(data.events || []);
    renderKalender();
    sembunyikanStatus();
    console.log("Total event dimuat:", data.total_event, data.events);

  } catch (err) {
    console.error(err);
    tampilStatus("Gagal memuat data event. Cek koneksi internet atau URL API, lalu muat ulang halaman.", true);
    renderKalender();
  }
}

// ---------- Tombol navigasi ----------
document.getElementById("btn-prev").addEventListener("click", function () {
  tanggalAktif = new Date(tanggalAktif.getFullYear(), tanggalAktif.getMonth() - 1, 1);
  renderKalender();
});

document.getElementById("btn-next").addEventListener("click", function () {
  tanggalAktif = new Date(tanggalAktif.getFullYear(), tanggalAktif.getMonth() + 1, 1);
  renderKalender();
});

document.getElementById("btn-hari-ini").addEventListener("click", function () {
  tanggalAktif = new Date();
  renderKalender();
});

// ---------- Jalan ----------
renderKalender();
muatData();