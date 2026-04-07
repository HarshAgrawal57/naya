# Deployment Guide for AttendIQ Frontend

## Project Structure Fixed ✅

The application has been restructured to work properly on Vercel:

```
naya/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Analytics.jsx
│   │   ├── Employees.jsx
│   │   ├── Records.jsx
│   │   └── LiveMap.jsx
│   ├── components/
│   │   └── CheckInModal.jsx
│   ├── utils/
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js (updated - proxy removed)
├── package.json
├── .env.production
└── .vercelignore
```

## Issues Fixed

### 1. ✅ File Structure
- **Before:** All JSX files were in root directory
- **After:** Organized into `src/pages`, `src/components`, `src/utils`
- **Why:** Vite expects standard React project structure with `src/` folder

### 2. ✅ Vite Configuration
- **Before:** Had localhost proxy for development
- **After:** Removed proxy settings for production
- **Why:** Vercel doesn't support proxies; APIs should be absolute URLs

### 3. ✅ Environment Variables
- **Before:** Hardcoded localhost URLs
- **After:** Using environment variables via `.env.production`
- **Why:** Production APIs are different from development

## Deploy on Vercel

### Step 1: Push to GitHub
```bash
git checkout setup-vercel-deployment
git push origin setup-vercel-deployment
```

### Step 2: Go to Vercel
1. Visit https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import `HarshAgrawal57/naya`

### Step 3: Configure Environment Variables
In Vercel dashboard → Project Settings → Environment Variables:

```
VITE_API_URL = https://your-backend-api.com/api/v1
VITE_WS_URL = wss://your-backend-api.com/ws
```

### Step 4: Deploy
Click "Deploy" - Vercel will automatically:
- ✅ Detect Vite project
- ✅ Run `npm install`
- ✅ Run `npm run build`
- ✅ Deploy `dist/` folder

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Important Notes

⚠️ **Update `.env.production` with your actual backend URL before deploying**

Current values are placeholders. Your backend server URL should be:
```
VITE_API_URL=https://your-backend.com/api/v1
VITE_WS_URL=wss://your-backend.com/ws
```

## Troubleshooting

**Issue:** 404 errors on page refresh
- **Solution:** Already configured in Vite - routes work correctly

**Issue:** API calls failing
- **Solution:** Check `VITE_API_URL` in Vercel environment variables

**Issue:** WebSocket connection failing
- **Solution:** Ensure `VITE_WS_URL` is using `wss://` (secure WebSocket) for HTTPS
