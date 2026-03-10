// =============================================
//  GRABIFY — Firebase Configuration
// =============================================

import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBlegaXTm-kZzlPoesU65DEwfAAvtLaC4g",
  authDomain:        "lyzy-downloader.firebaseapp.com",
  projectId:         "lyzy-downloader",
  storageBucket:     "lyzy-downloader.firebasestorage.app",
  messagingSenderId: "419225641839",
  appId:             "1:419225641839:web:ef058447ce1805331efe9a",
  databaseURL:       "https://lyzy-downloader-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getDatabase(app);
