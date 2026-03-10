# Grabify — Social Video Downloader

Multi-platform video downloader with Premium (GCash) + Admin Panel.
Uses **Firebase Realtime Database** (asia-southeast1 / Singapore).

---

## 📁 File Structure

```
grabify/
├── index.html
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── firebase-config.js  ← Firebase credentials (already set)
│   ├── auth.js
│   ├── app.js
│   └── admin.js            ← Set your email & secret key here
└── admin/
    └── index.html
```

---

## ✅ Firebase Realtime Database Rules

Paste this into Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "gcash_payments": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## ⚙️ Setup Steps

### 1. Enable Google Auth
Firebase Console → Authentication → Sign-in method → Enable **Google**

### 2. Set Your Admin Email
Open `js/admin.js` line 14:
```js
const ADMIN_EMAILS = ["YOUR_ADMIN_EMAIL@gmail.com"];
```

### 3. Change Admin Secret Key (optional)
Open `js/admin.js` line 13:
```js
const ADMIN_SECRET = "grabify_admin_2025"; // Change this!
```

### 4. Admin Panel URL
```
https://yourdomain.com/admin/index.html?key=grabify_admin_2025
```
Keep this URL private!

---

## 💳 Premium Flow

1. User clicks **Get Premium → GCash**
2. They send ₱99 to **09538728759**
3. They paste their reference number
4. You see it in Admin Panel → Payments
5. Click **✓ Approve** → Premium is instantly granted

---

## 🚀 Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/grabify.git
git push -u origin main
```
Then: GitHub repo → Settings → Pages → Deploy from `main` branch.

---

## ⚠️ Disclaimer

Only download videos you own or have rights to.
Not affiliated with Meta, Instagram, or any platform.
