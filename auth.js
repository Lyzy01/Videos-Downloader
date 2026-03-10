// =============================================
//  GRABIFY — Auth Module (Realtime Database)
// =============================================

import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const provider = new GoogleAuthProvider();

window.currentUser = null;
window.isPremium   = false;

export async function checkPremium(uid) {
  try {
    const snap = await get(ref(db, `users/${uid}/premium`));
    return snap.exists() && snap.val() === true;
  } catch (e) {
    console.warn("Premium check failed:", e);
  }
  return false;
}

function updateAuthUI(user) {
  const authArea  = document.getElementById("authArea");
  const premBadge = document.getElementById("premiumBadge");

  if (user) {
    authArea.innerHTML = `
      <div class="user-badge">
        ${window.isPremium ? '<span class="user-premium-dot"></span>' : ''}
        <img class="user-avatar" src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=c13584&color=fff'}" alt="avatar"/>
        <span>${user.displayName?.split(" ")[0] || "User"}</span>
        <button class="btn-login" id="logoutBtn" style="background:transparent;border:1px solid var(--border2);color:var(--muted)">Sign out</button>
      </div>`;
    document.getElementById("logoutBtn")?.addEventListener("click", () => signOut(auth));
    if (premBadge) premBadge.style.display = window.isPremium ? "inline-flex" : "none";
  } else {
    authArea.innerHTML = `<button class="btn-login" id="loginBtn">Sign in</button>`;
    document.getElementById("loginBtn")?.addEventListener("click", () => {
      document.getElementById("signInModal").style.display = "flex";
    });
    if (premBadge) premBadge.style.display = "none";
  }
}

onAuthStateChanged(auth, async (user) => {
  window.currentUser = user;
  if (user) {
    window.isPremium = await checkPremium(user.uid);
  } else {
    window.isPremium = false;
  }
  updateAuthUI(user);
  if (typeof window.renderQualityGrid === "function") {
    window.renderQualityGrid();
  }
});

document.getElementById("googleSignIn")?.addEventListener("click", async () => {
  const status = document.getElementById("signInStatus");
  try {
    status.textContent = "Opening Google sign-in...";
    await signInWithPopup(auth, provider);
    document.getElementById("signInModal").style.display = "none";
    status.textContent = "";
  } catch (e) {
    status.className = "modal-note error";
    status.textContent = "Sign-in failed. Try again.";
  }
});

document.getElementById("signInClose")?.addEventListener("click", () => {
  document.getElementById("signInModal").style.display = "none";
});
