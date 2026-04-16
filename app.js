import { db, auth } from "./firebase.js";
import {
  collection, addDoc, getDocs, onSnapshot,
  serverTimestamp, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMIN_EMAIL = "roobis2005@gmail.com";

// ── Helpers ──────────────────────────────────────
export function showSpinner() {
  document.getElementById("spinner")?.classList.remove("hidden");
}
export function hideSpinner() {
  document.getElementById("spinner")?.classList.add("hidden");
}
export function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("show")));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

// ── Avatar images ────────────────────────────────
const AVATARS = [
  "assets/neutral.png",
  "assets/caring.png",
  "assets/innocent.png",
  "assets/caring.png",
  "assets/caring.png",
  "assets/caring.png",

];

// ── PAGE: index.html ─────────────────────────────
function initHome() {
  document.getElementById("btn-add")
    ?.addEventListener("click", () => window.location.href = "form.html");
  document.getElementById("btn-letter")
    ?.addEventListener("click", () => window.location.href = "letter.html");

  // Floating particles
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener("resize", () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  const particles = Array.from({length: 40}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: 1 + Math.random()*2,
    vx: (Math.random()-.5)*.4, vy: -.3 - Math.random()*.5,
    o: Math.random()*.6 + .1
  }));

  function draw() {
    ctx.clearRect(0,0,W,H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(232,98,122,${p.o})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random()*W; }
      if (p.x < -5) p.x = W+5;
      if (p.x > W+5) p.x = -5;
    });
    requestAnimationFrame(draw);
  }
  draw();
}


// ── PAGE: admin-login.html ───────────────────────
function initAdminLogin() {
  onAuthStateChanged(auth, user => {
    if (user?.email === ADMIN_EMAIL) window.location.href = "admin.html";
  });

  document.getElementById("login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pass  = document.getElementById("password").value;

    if (email !== ADMIN_EMAIL) { showToast("Access denied 🔐", "error"); return; }

    showSpinner();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      hideSpinner();
      window.location.href = "admin.html";
    } catch {
      hideSpinner();
      showToast("Invalid credentials 🔐", "error");
    }
  });
}

// ── PAGE: admin.html ─────────────────────────────
function initAdmin() {
  onAuthStateChanged(auth, user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      window.location.href = "admin-login.html"; return;
    }
    loadEntries();
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "admin-login.html";
  });

  document.getElementById("search-input")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll(".entry-card").forEach(card => {
      const name = card.dataset.name?.toLowerCase() || "";
      const msg  = card.dataset.msg?.toLowerCase()  || "";
      card.style.display = (name.includes(q) || msg.includes(q)) ? "" : "none";
    });
  });

  let allDocs = [];

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      document.querySelectorAll(".entry-card").forEach(card => {
        if (f === "all")    card.style.display = "";
        else if (f === "memory") card.style.display = card.dataset.memory === "true" ? "" : "none";
        else                card.style.display = card.dataset.memory === "false" ? "" : "none";
      });
    });
  });

  function loadEntries() {
    showSpinner();
    const grid    = document.getElementById("entries-grid");
    const counter = document.getElementById("entry-count");
    const memCount= document.getElementById("mem-count");

    onSnapshot(collection(db, "entries"), snap => {
      hideSpinner();
      grid.innerHTML = "";
      if (counter) counter.textContent = snap.size;

      let memories = 0;
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      docs.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

      if (!docs.length) {
        grid.innerHTML = `<div class="empty-state"><p>No memories yet 💭</p><p class="empty-sub">Be the first to write something beautiful</p></div>`;
        return;
      }

      docs.forEach(d => {
        if (d.shareMemory) memories++;
        const card = document.createElement("div");
        card.className = `entry-card card card-hover fade-up ${d.shareMemory ? "memory-card" : ""}`;
        card.dataset.name   = d.name?.toLowerCase() || "";
        card.dataset.msg    = d.message?.toLowerCase() || "";
        card.dataset.memory = String(!!d.shareMemory);

        const ts = d.createdAt?.seconds ? new Date(d.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";

        card.innerHTML = `
          ${d.shareMemory ? '<div class="memory-flag">💜 Shares Memory</div>' : ''}
          <div class="ec-img">
            <img src="${d.selectedImage||AVATARS[0]}" alt="${esc(d.name)}" onerror="this.src='${AVATARS[0]}'"/>
          </div>
          <div class="ec-body">
            <div class="ec-name">${esc(d.name||"Anonymous")}</div>
            <div class="ec-roll">Roll: ${esc(d.roll||"—")}</div>
            <div class="ec-preview">"${esc((d.message||"No message").slice(0,65))}${(d.message||"").length>65?"…":""}"</div>
            <div class="ec-footer">
              <span class="ec-rating">⭐ ${d.answers?.rating||"?"}/10</span>
              ${d.answers?.oneWord ? `<span class="ec-word">"${esc(d.answers.oneWord)}"</span>` : ""}
              <span class="ec-date">${ts}</span>
            </div>
          </div>`;

        card.addEventListener("click", () => {
          localStorage.setItem("selectedEntry", JSON.stringify({ id: d.id, ...d }));
          window.location.href = "detail.html";
        });
        grid.appendChild(card);
      });

      if (memCount) memCount.textContent = memories;
    });
  }
}

// ── PAGE: detail.html ────────────────────────────
function initDetail() {
  onAuthStateChanged(auth, user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      window.location.href = "admin-login.html"; return;
    }

    const raw = localStorage.getItem("selectedEntry");
    if (!raw) { window.location.href = "admin.html"; return; }
    const d = JSON.parse(raw);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val||"—"; };
    set("detail-name",        d.name);
    set("detail-roll",        d.roll);
    set("detail-impression",  d.answers?.impression);
    set("detail-personality", d.answers?.personality);
    set("detail-improve",     d.answers?.improve);
    set("detail-oneword",     d.answers?.oneWord);
    set("detail-rating",      `${d.answers?.rating||"?"} / 10`);
    set("detail-message",     d.message);

    const img = document.getElementById("detail-img");
    if (img) { img.src = d.selectedImage||AVATARS[0]; img.onerror = () => img.src = AVATARS[0]; }

    const ts = d.createdAt?.seconds
      ? new Date(d.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})
      : "Unknown";
    set("detail-date", ts);

    if (d.shareMemory) {
      document.getElementById("memory-banner")?.classList.add("show");
      document.getElementById("detail-wrap")?.classList.add("memory-glow");
    }

    document.getElementById("btn-back")
      ?.addEventListener("click", () => window.location.href = "admin.html");
  });
}

// ── PAGE: letter.html ────────────────────────────
function initLetter() {
  const imgInput   = document.getElementById("letter-img-input");
  const textInput  = document.getElementById("letter-text");
  const fromInput  = document.getElementById("letter-from");
  const toInput    = document.getElementById("letter-to");
  const preview    = document.getElementById("letter-preview");
  const previewImg = document.getElementById("preview-img");
  const previewTxt = document.getElementById("preview-text");
  const previewFrom= document.getElementById("preview-from");
  const previewTo  = document.getElementById("preview-to");
  const downloadBtn= document.getElementById("btn-download");

  // Theme switcher
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      preview.dataset.theme = btn.dataset.theme;
    });
  });

  imgInput?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      previewImg.src = ev.target.result;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  const sync = () => {
    if (previewTxt)  previewTxt.textContent  = textInput?.value  || "Your message will appear here…";
    if (previewFrom) previewFrom.textContent = fromInput?.value  || "Your Name";
    if (previewTo)   previewTo.textContent   = toInput?.value    || "Roobi";
  };
  [textInput, fromInput, toInput].forEach(el => el?.addEventListener("input", sync));

  downloadBtn?.addEventListener("click", async () => {
    if (typeof html2canvas === "undefined") { showToast("html2canvas not loaded", "error"); return; }
    showSpinner();
    try {
      const canvas = await html2canvas(preview, { scale: 2, useCORS: true, backgroundColor: null });
      hideSpinner();
      const a = document.createElement("a");
      a.download = `roobis-letter-${Date.now()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      showToast("Letter downloaded! 💌");
    } catch(err) {
      hideSpinner(); showToast("Download failed 😢", "error"); console.error(err);
    }
  });
}

// ── Util ─────────────────────────────────────────
function esc(str) {
  return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Router ───────────────────────────────────────
const page = document.body.dataset.page;
document.addEventListener("DOMContentLoaded", () => {
  if (page === "home")        initHome();
  else if (page === "admin-login") initAdminLogin();
  else if (page === "admin")  initAdmin();
  else if (page === "detail") initDetail();
  else if (page === "letter") initLetter();
});
