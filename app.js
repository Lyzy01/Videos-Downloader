// =============================================
//  GRABIFY — Main App Logic (Realtime Database)
// =============================================

import { db } from "./firebase-config.js";
import { ref, push, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ---- State ----
let activePlatform   = "instagram";
let lastFetchedLinks = [];

// ---- Platform Tabs ----
document.querySelectorAll(".platform-tab:not(.coming-soon)").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".platform-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activePlatform = tab.dataset.platform;
    document.getElementById("platformLabel").textContent =
      tab.querySelector("span:nth-child(2)")?.textContent || activePlatform;
    resetDownloader();
  });
});

document.querySelectorAll(".platform-tab.coming-soon").forEach(tab => {
  tab.addEventListener("click", () => {
    showStatus(`${tab.querySelector("span:nth-child(2)")?.textContent} is coming soon! 🚀`, "loading");
  });
});

// ---- Input ----
const urlInput = document.getElementById("urlInput");
const clearBtn = document.getElementById("clearBtn");

urlInput?.addEventListener("input", () => {
  clearBtn.style.display = urlInput.value ? "block" : "none";
});

clearBtn?.addEventListener("click", () => {
  urlInput.value = "";
  clearBtn.style.display = "none";
  resetDownloader();
});

urlInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") fetchVideo();
});

document.getElementById("fetchBtn")?.addEventListener("click", fetchVideo);

// ---- Quality Definitions ----
const qualities = [
  { id: "sd",  label: "SD",  name: "480p",  info: "Standard",   premium: false },
  { id: "hd",  label: "HD",  name: "720p",  info: "High Def",   premium: false },
  { id: "fhd", label: "FHD", name: "1080p", info: "Full HD",    premium: true  },
  { id: "2k",  label: "2K",  name: "1440p", info: "Quad HD",    premium: true  },
  { id: "4k",  label: "4K",  name: "2160p", info: "Ultra HD",   premium: true  },
  { id: "mp3", label: "MP3", name: "Audio", info: "Audio only", premium: true  },
];

window.renderQualityGrid = function () {
  const grid = document.getElementById("qualityGrid");
  if (!grid || lastFetchedLinks.length === 0) return;

  grid.innerHTML = "";
  qualities.forEach(q => {
    const canUse = !q.premium || window.isPremium;
    const link   = lastFetchedLinks.find(l => matchQuality(l, q.id)) || lastFetchedLinks[0];

    const item = document.createElement("div");
    item.className = "quality-item" + (canUse ? "" : " locked");
    item.innerHTML = `
      <span class="quality-badge ${q.premium ? "" : "free"}">${q.premium ? "⭐ PREMIUM" : "FREE"}</span>
      <span class="quality-name">${q.name}</span>
      <span class="quality-info">${q.info}</span>`;

    item.addEventListener("click", () => {
      if (!canUse) {
        document.getElementById("gcashModal").style.display = "flex";
        return;
      }
      triggerDownload(link?.url || "#", q.name, q.id === "mp3");
    });

    grid.appendChild(item);
  });
};

function matchQuality(link, qid) {
  const res = (link.resolution || link.quality || "").toLowerCase();
  if (qid === "sd")  return res.includes("480") || res.includes("sd");
  if (qid === "hd")  return res.includes("720") || res.includes("hd");
  if (qid === "fhd") return res.includes("1080");
  if (qid === "2k")  return res.includes("1440") || res.includes("2k");
  if (qid === "4k")  return res.includes("2160") || res.includes("4k");
  if (qid === "mp3") return res.includes("mp3") || res.includes("audio");
  return false;
}

// ---- Fetch Video ----
async function fetchVideo() {
  const url = urlInput?.value.trim();
  if (!url) { showStatus("Please paste a video URL.", "error"); return; }
  if (!isValidUrl(url)) { showStatus("That doesn't look like a valid URL.", "error"); return; }

  const btn     = document.getElementById("fetchBtn");
  const txt     = document.getElementById("fetchBtnText");
  const spinner = document.getElementById("btnSpinner");

  btn.disabled = true;
  txt.style.display = "none";
  spinner.style.display = "block";
  showStatus('<span style="color:#f9a826">⟳ Fetching video info...</span>', "loading");
  document.getElementById("resultArea").style.display = "none";
  lastFetchedLinks = [];

  try {
    const links = await resolveLinks(url);
    if (links && links.length > 0) {
      lastFetchedLinks = links;
      showStatus("✓ Video found! Choose your quality below.", "success");
      document.getElementById("resultArea").style.display = "block";
      window.renderQualityGrid();
    } else {
      showManualFallback();
    }
  } catch {
    showManualFallback();
  }

  btn.disabled = false;
  txt.style.display = "inline";
  spinner.style.display = "none";
}

// ---- Resolve Links via CORS proxy ----
async function resolveLinks(url) {
  try {
    const api = `https://saveig.app/api?url=${encodeURIComponent(url)}`;
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(api)}`);
    if (!res.ok) return null;
    const data   = await res.json();
    const parsed = JSON.parse(data.contents);
    if (parsed?.links?.length > 0) return parsed.links;
    if (parsed?.url) return [{ url: parsed.url, quality: "HD" }];
  } catch { /* fall through */ }
  return null;
}

// ---- Download Animation ----
function triggerDownload(url, label, isAudio) {
  const overlay = document.getElementById("dlAnimation");
  const bar     = document.getElementById("dlBar");
  const dlText  = document.getElementById("dlText");

  overlay.style.display = "flex";
  bar.style.width = "0%";
  dlText.textContent = `Preparing ${label} download...`;

  const steps = [
    { pct: 20,  msg: "Connecting to server..."   },
    { pct: 45,  msg: `Processing ${label}...`    },
    { pct: 70,  msg: "Encoding stream..."         },
    { pct: 90,  msg: "Almost ready..."            },
    { pct: 100, msg: `${label} ready! Starting download...` },
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(interval);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grabify-${activePlatform}-${label}.${isAudio ? "mp3" : "mp4"}`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { overlay.style.display = "none"; bar.style.width = "0%"; }, 1200);
      return;
    }
    const step = steps[i++];
    bar.style.width = step.pct + "%";
    dlText.textContent = step.msg;
  }, 500);
}

// ---- Manual Fallback ----
function showManualFallback() {
  lastFetchedLinks = [{ url: "#", quality: "HD" }];
  showStatus("⚠ Auto-fetch unavailable. See manual options below.", "error");
  document.getElementById("resultArea").style.display = "block";
  document.getElementById("qualityGrid").innerHTML = `
    <div style="grid-column:1/-1;background:var(--bg);border:1px solid var(--border2);border-radius:12px;padding:1.25rem;font-size:0.82rem;font-family:'JetBrains Mono',monospace;color:var(--muted);line-height:1.9;">
      <div style="color:var(--text);font-weight:600;margin-bottom:0.5rem;">Manual options:</div>
      <div>• <a href="https://snapinsta.app" target="_blank" style="color:#f9a826">snapinsta.app</a> — Instagram</div>
      <div>• <a href="https://getfvid.com" target="_blank" style="color:#f9a826">getfvid.com</a> — Facebook</div>
      <div style="margin-top:0.75rem;font-size:0.72rem;color:#555;">A backend server is needed for full automation.</div>
    </div>`;
}

// ---- Helpers ----
function showStatus(msg, type) {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.className = "status-text " + type;
  el.innerHTML = msg;
}

function isValidUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

function resetDownloader() {
  document.getElementById("resultArea").style.display = "none";
  showStatus("", "");
  lastFetchedLinks = [];
}

// ---- GCash Modal ----
document.getElementById("btnGetPremium")?.addEventListener("click", () => {
  document.getElementById("gcashModal").style.display = "flex";
});

document.getElementById("modalClose")?.addEventListener("click", () => {
  document.getElementById("gcashModal").style.display = "none";
});

window.copyGcash = function () {
  navigator.clipboard.writeText("09538728759").then(() => {
    const btn = document.querySelector(".copy-btn");
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 2000);
  });
};

// ---- Submit GCash Reference to Firebase Realtime DB ----
document.getElementById("submitRef")?.addEventListener("click", async () => {
  const ref_val  = document.getElementById("refInput")?.value.trim();
  const name     = document.getElementById("refName")?.value.trim();
  const status   = document.getElementById("submitStatus");
  const btn      = document.getElementById("submitRef");

  if (!ref_val || ref_val.length < 6) {
    status.className = "modal-note error";
    status.textContent = "Please enter a valid reference number.";
    return;
  }

  btn.disabled = true;
  status.className = "modal-note";
  status.textContent = "Submitting...";

  try {
    const newRef = push(ref(db, "gcash_payments"));
    await set(newRef, {
      referenceNumber: ref_val,
      name:            name || "Anonymous",
      uid:             window.currentUser?.uid  || null,
      email:           window.currentUser?.email || null,
      status:          "pending",
      createdAt:       Date.now()
    });

    status.className = "modal-note success";
    status.textContent = "✓ Submitted! Premium will be activated within 24h after verification.";
    document.getElementById("refInput").value = "";
    document.getElementById("refName").value  = "";
  } catch (e) {
    status.className = "modal-note error";
    status.textContent = "Failed to submit. Check your internet connection.";
    console.error(e);
  }

  btn.disabled = false;
});

// Close modals on overlay click
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.style.display = "none";
  });
});
