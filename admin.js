// =============================================
//  GRABIFY — Admin Logic (Realtime Database)
//  URL: /admin/index.html?key=grabify_admin_2025
// =============================================

import { auth, db } from "../js/firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  ref, get, set, update, onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// =============================================
//  SECRET KEY — Change this to your own secret!
//  Access: /admin/index.html?key=grabify_admin_2025
// =============================================
const ADMIN_SECRET = "grabify_admin_2025";
const ADMIN_EMAILS = ["YOUR_ADMIN_EMAIL@gmail.com"]; // ← Replace with your Gmail

const params = new URLSearchParams(window.location.search);
if (params.get("key") !== ADMIN_SECRET) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0d;color:#333;font-family:monospace;">
      404 — Page not found
    </div>`;
  throw new Error("Unauthorized");
}

// =============================================
//  AUTH
// =============================================
const provider = new GoogleAuthProvider();
let allPayments  = [];
let activeFilter = "all";

document.getElementById("adminGoogleLogin")?.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    document.getElementById("loginError").textContent = "Sign-in failed. Try again.";
  }
});

document.getElementById("adminSignOut")?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user && ADMIN_EMAILS.includes(user.email)) {
    document.getElementById("loginGate").style.display = "none";
    document.getElementById("adminDash").style.display = "flex";
    document.getElementById("adminUserInfo").textContent = user.email;
    loadPaymentsRealtime();
    loadUsers();
  } else if (user) {
    await signOut(auth);
    document.getElementById("loginError").textContent = "Access denied. Not an admin account.";
  } else {
    document.getElementById("loginGate").style.display = "flex";
    document.getElementById("adminDash").style.display = "none";
  }
});

// =============================================
//  TABS
// =============================================
document.querySelectorAll(".snav").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".snav").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");
  });
});

// =============================================
//  PAYMENTS — Realtime listener
// =============================================
function loadPaymentsRealtime() {
  onValue(ref(db, "gcash_payments"), (snap) => {
    allPayments = [];
    snap.forEach(child => {
      allPayments.push({ id: child.key, ...child.val() });
    });
    // Sort newest first
    allPayments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderPayments();
    updateStats();
    document.getElementById("pendingCount").textContent =
      allPayments.filter(p => p.status === "pending").length + " pending";
  });
}

document.getElementById("refreshBtn")?.addEventListener("click", () => {
  loadUsers();
  showToast("Refreshed!");
});

function renderPayments() {
  const tbody    = document.getElementById("paymentsBody");
  const filtered = activeFilter === "all"
    ? allPayments
    : allPayments.filter(p => p.status === activeFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => `
    <tr>
      <td style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:0.75rem">${i + 1}</td>
      <td><span class="ref-code">${p.referenceNumber || "—"}</span></td>
      <td>${p.name || "—"}</td>
      <td class="email-cell">${p.email || p.uid || "—"}</td>
      <td class="date-cell">${formatDate(p.createdAt)}</td>
      <td><span class="badge badge-${p.status || "pending"}">${p.status || "pending"}</span></td>
      <td>
        <div class="action-btns">
          ${p.status !== "approved"
            ? `<button class="act-btn act-approve" onclick="approvePayment('${p.id}','${p.uid || ""}')">✓ Approve</button>`
            : ""}
          ${p.status !== "rejected"
            ? `<button class="act-btn act-reject" onclick="rejectPayment('${p.id}')">✕ Reject</button>`
            : ""}
        </div>
      </td>
    </tr>`).join("");
}

// =============================================
//  FILTERS
// =============================================
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderPayments();
  });
});

// =============================================
//  APPROVE / REJECT
// =============================================
window.approvePayment = async function (paymentId, uid) {
  try {
    await update(ref(db, `gcash_payments/${paymentId}`), {
      status: "approved",
      approvedAt: Date.now()
    });
    if (uid) {
      await set(ref(db, `users/${uid}/premium`), true);
      await set(ref(db, `users/${uid}/premiumGrantedAt`), Date.now());
    }
    showToast("✓ Approved & Premium granted!");
  } catch (e) {
    showToast("Error: " + e.message, true);
  }
};

window.rejectPayment = async function (paymentId) {
  try {
    await update(ref(db, `gcash_payments/${paymentId}`), {
      status: "rejected",
      rejectedAt: Date.now()
    });
    showToast("✕ Payment rejected.");
  } catch (e) {
    showToast("Error: " + e.message, true);
  }
};

// =============================================
//  USERS
// =============================================
async function loadUsers() {
  const tbody = document.getElementById("usersBody");
  tbody.innerHTML = `<tr><td colspan="4" class="loading-row">Loading...</td></tr>`;

  try {
    const snap = await get(ref(db, "users"));
    if (!snap.exists()) {
      tbody.innerHTML = `<tr><td colspan="4" class="loading-row">No users yet.</td></tr>`;
      document.getElementById("premiumCount").textContent = "0 premium";
      return;
    }

    const users = [];
    snap.forEach(child => users.push({ id: child.key, ...child.val() }));

    document.getElementById("premiumCount").textContent =
      users.filter(u => u.premium).length + " premium";

    tbody.innerHTML = users.map(u => `
      <tr>
        <td class="email-cell">${u.id}</td>
        <td class="email-cell">${u.email || "—"}</td>
        <td><span class="badge ${u.premium ? "badge-approved" : "badge-rejected"}">${u.premium ? "Premium" : "Free"}</span></td>
        <td>
          <div class="action-btns">
            ${!u.premium
              ? `<button class="act-btn act-approve" onclick="grantPremium('${u.id}')">Grant</button>`
              : `<button class="act-btn act-reject"  onclick="revokePremium('${u.id}')">Revoke</button>`}
          </div>
        </td>
      </tr>`).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="loading-row">Error: ${e.message}</td></tr>`;
  }
}

window.grantPremium = async function (uid) {
  await set(ref(db, `users/${uid}/premium`), true);
  await set(ref(db, `users/${uid}/premiumGrantedAt`), Date.now());
  showToast("⭐ Premium granted!");
  loadUsers();
};

window.revokePremium = async function (uid) {
  await set(ref(db, `users/${uid}/premium`), false);
  showToast("Premium revoked.");
  loadUsers();
};

// =============================================
//  STATS
// =============================================
function updateStats() {
  const total    = allPayments.length;
  const pending  = allPayments.filter(p => p.status === "pending").length;
  const approved = allPayments.filter(p => p.status === "approved").length;
  document.getElementById("statTotal").textContent    = total;
  document.getElementById("statPending").textContent  = pending;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statRevenue").textContent  = "₱" + (approved * 99).toLocaleString();
}

// =============================================
//  HELPERS
// =============================================
function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.borderColor = isError ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}
