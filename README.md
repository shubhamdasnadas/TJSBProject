# Synology Access Viewer

A Next.js application to view and manage Synology NAS users, shares, and files through the Synology API.

## Features

- 🔐 Login to Synology NAS
- 👥 View all users
- 📁 View shared folders
- 📄 Browse files in shared folders
- 🎨 Modern UI with Ant Design

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Edit `.env.local` and set your Synology NAS URL:
   ```env
   SYNOLOGY_URL=http://192.168.1.100:5000
   ```
   
   Replace with your actual Synology NAS IP address and port.

3. **Update credentials:**
   
   In `app/synology/page.tsx`, update the login credentials (line 20-21):
   ```typescript
   const login = await axios.post("/api/synology/login", {
     user: "your-username",
     pass: "your-password",
   });
   ```

## Running the App

```bash
npm run dev
```

Open [http://localhost:3000/synology](http://localhost:3000/synology) in your browser.

## Project Structure

```
app/
├── layout.tsx           # Root layout with <html> and <body> tags
├── globals.css          # Global styles
├── synology/
│   └── page.tsx        # Main Synology viewer page
└── api/
    └── synology/
        ├── login/      # Login API endpoint
        ├── users/      # Users list API endpoint
        ├── shares/     # Shared folders API endpoint
        └── files/      # Files list API endpoint

lib/
└── synology-types.ts   # TypeScript type definitions
```

## API Routes

- **POST** `/api/synology/login` - Login to Synology NAS
- **GET** `/api/synology/users` - Get list of users
- **GET** `/api/synology/shares` - Get list of shared folders
- **POST** `/api/synology/files` - Get files in a folder

## Technologies

- Next.js 16 (App Router)
- TypeScript
- Ant Design
- Axios
- Synology Web API

## Notes

- Make sure your Synology NAS is accessible from your development machine
- The default credentials in the code are `admin/password` - change these to your actual credentials
- CORS may need to be configured on your Synology NAS for local development
