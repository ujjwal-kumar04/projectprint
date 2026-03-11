# PhotoPass Pro — MERN Stack
## Multi-Vendor Passport Photo SaaS with Admin Control

---

## Project Structure

```
shop/
├── server/          ← Node.js + Express + MongoDB backend
└── client/          ← React + Vite + Tailwind CSS frontend
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB Atlas account (free) — https://cloud.mongodb.com
- EmailJS account (free) — https://www.emailjs.com

---

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/photopass
JWT_SECRET=any_long_random_string_here
PORT=5000
CLIENT_URL=http://localhost:5173
```

Start the server:
```bash
npm run dev        # development (nodemon)
npm start          # production
```

---

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev        # opens http://localhost:5173
```

---

### 4. Create the First Admin Account

Call this endpoint **once** to seed the admin user:

```bash
curl -X POST http://localhost:5000/api/auth/init-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@photopass.com","password":"Admin@123","name":"Super Admin"}'
```

Then **log in** at `http://localhost:5173/login` with those credentials.

---

### 5. EmailJS Setup (Contact Admin form)

1. Sign up at https://www.emailjs.com
2. Create an **Email Service** (connect your Gmail / Outlook)
3. Create an **Email Template** with these variables:

```
Subject: Support Request from {{shop_name}}

From: {{from_name}} <{{from_email}}>
Shop: {{shop_name}}

{{message}}
```

4. Edit `client/src/components/ContactAdmin.jsx` and fill in:
```js
const EMAILJS_SERVICE_ID  = 'service_xxxxxxx';
const EMAILJS_TEMPLATE_ID = 'template_xxxxxxx';
const EMAILJS_PUBLIC_KEY  = 'xxxxxxxxxxxxxxxxxxxx';
const ADMIN_EMAIL         = 'your-admin@email.com';
```

---

## Admin Workflow

1. Log in → `/admin`
2. Click **"+ Add Shopkeeper"** → fill in name, shop name, email, password
3. A unique `shopId` (UUID) is auto-generated
4. Click **QR** → see & **Download QR Code**
5. Hand the printed QR to the shopkeeper
6. **Disable** a shopkeeper instantly if needed (their QR stops working)

---

## Shopkeeper Workflow

1. Log in (credentials provided by admin) → `/dashboard`
2. See real-time customer uploads as they come in
3. Click any image → **Passport Editor**:
   - **Remove Background** (free AI, runs in your browser)
   - Pick background color (white, blue, any custom color)
   - **Generate 6-Photo Grid** (3.5 × 4.5 cm each, print-ready)
   - **Download JPG** or **Download PDF**
4. Use **Contact Admin** tab to send a support message via EmailJS

---

## Customer Workflow

1. Scan shopkeeper's QR code → `yoursite.com/upload?shopId=UUID`
2. Enter name + upload photo or PDF
3. Done — the shopkeeper sees it in real time

---

## Security Model (Data Isolation)

| Rule | How Enforced |
|------|-------------|
| Shopkeeper sees only their own uploads | `Upload.find({ shopId: req.user.shopId })` — server-enforced, not frontend |
| Shopkeeper can't delete another shop's uploads | Same shopId filter on DELETE route |
| Admin-only routes | `adminOnly` middleware on all `/api/admin/*` routes |
| Disabled accounts can't log in | `isActive` check on every protected route |
| JWT expiry | 7 days; re-verified on every page refresh via `/api/auth/me` |
| File type validation | Multer `fileFilter` allows only JPEG/PNG/WebP/PDF |
| File size limit | 10 MB max per upload |

---

## Firebase Security Rules (if migrating to Firebase later)

```js
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admins can read/write everything
    match /{document=**} {
      allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    // Shopkeepers can only see their own uploads
    match /uploads/{uploadId} {
      allow read, delete: if request.auth != null
        && resource.data.shopId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.shopId;
      allow create: if true; // public upload
    }
  }
}
```

---

## Production Build

```bash
# Build React client
cd client && npm run build

# Serve static files from Express (add to server.js)
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
```

Deploy to: **Railway / Render / Fly.io** (free tier available on all three).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Mongoose) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | Socket.IO |
| File uploads | Multer (local disk) |
| QR Codes | qrcode.react |
| Background Removal | @imgly/background-removal (free, in-browser AI) |
| PDF/JPG Export | jsPDF + Canvas API |
| Email | EmailJS (no server needed) |
