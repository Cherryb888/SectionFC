# Section FC Hub

Your team management app — built with React + Firebase.

---

## 🔑 Admin PIN

The default admin PIN is: **sfc2024**

To change it, open `src/App.jsx` and edit line 8:
```js
const ADMIN_PIN = 'sfc2024'; // Change this to your own PIN
```

You and Dani use the same PIN. Players don't need one.

---

## 🚀 Deployment (one-time setup)

### Step 1 — Install Node.js
Download and install from: https://nodejs.org (choose the LTS version)

### Step 2 — Install Firebase CLI
Open Terminal (Mac) or Command Prompt (Windows) and run:
```
npm install -g firebase-tools
```

### Step 3 — Unzip this project
Put the `section-fc-hub` folder somewhere easy to find (e.g. your Desktop).

### Step 4 — Open a terminal in the project folder
- **Mac**: Right-click the folder → "New Terminal at Folder"
- **Windows**: Open Command Prompt, type `cd ` then drag the folder in

### Step 5 — Install dependencies
```
npm install
```

### Step 6 — Log in to Firebase
```
firebase login
```
This opens a browser — sign in with the Google account you used to set up Firebase.

### Step 7 — Enable Firestore in Firebase Console
1. Go to https://console.firebase.google.com
2. Click your **section-fc** project
3. In the left menu click **Firestore Database**
4. Click **Create database**
5. Choose **Start in test mode** → click Next → choose a location → Done

### Step 8 — Build and deploy
```
npm run build
firebase deploy
```

That's it! Firebase will give you a URL like:
**https://section-fc.web.app**

Share that link with your squad. You and Dani log in with the admin PIN.

---

## 🔄 Updating the app

Whenever you want to make changes:
1. Edit the files
2. Run `npm run build`
3. Run `firebase deploy`

Takes about 30 seconds.

---

## 📱 Adding to phone home screen

On iPhone: Open the URL in Safari → Share button → "Add to Home Screen"
On Android: Open in Chrome → three dots menu → "Add to Home Screen"

It'll look and feel like a proper app.

---

## 👥 Who can do what

| Feature | Players | Admins (you + Dani) |
|---|---|---|
| View stats, table, fixtures, Hall of Fame | ✅ | ✅ |
| Submit score prediction | ✅ | ✅ |
| Edit player stats | ❌ | ✅ |
| Assign Hall of Fame winners | ❌ | ✅ |
| Set up score predictor match | ❌ | ✅ |
| Reveal prediction results | ❌ | ✅ |
| Matchday team randomiser | ❌ | ✅ |
