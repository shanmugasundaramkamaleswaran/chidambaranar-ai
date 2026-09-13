# CHIDAMBARANAR AI

CHIDAMBARANAR AI is an employee well-being platform with separate employee, psychologist, and organization-officer portals. Psychologist communication is private, REST-based text messaging. ABIMANYUAI remains a separate AI assistant conversation.

## Architecture

- `frontend/`: React, TypeScript, Vite, Tailwind, Recharts
- `backend/`: Express, JWT/RBAC, bcrypt, JSON-file persistence
- `backend/src/database.json`: current development persistence store
- `backend/src/services/messages.service.js`: authorized encrypted-at-rest messaging

There is no LiveKit, WebRTC, video, microphone, or audio-call implementation in the active application.

## Local Setup

Backend:

```powershell
cd backend
npm install
npm start
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Environment

Copy the example files and provide real values through the deployment platform. Never commit `.env` files or secrets.

Backend required values:

- `PORT`
- `JWT_SECRET` with at least 32 characters
- `MESSAGE_ENCRYPTION_KEY` with at least 32 characters
- `GEMINI_API_KEY` is optional; clinical reports use the local fallback when absent

Frontend public configuration is documented in [frontend/.env.example](frontend/.env.example). `VITE_` values are public browser configuration and must never contain backend secrets.

## Messaging Flow

1. An employee requests a psychologist consultation.
2. The psychologist accepts the request.
3. The existing conversation API creates or returns a private conversation only when the employee and psychologist are assigned or have an accepted consultation in the same organization.
4. Both participants use the existing psychologist chat UI through REST endpoints.

The backend derives identity and role from the authenticated JWT. Organization officers cannot access private conversation routes. Messages use authenticated application-level encryption at rest; this is not client-to-client end-to-end encryption.

## Validation

```powershell
cd frontend
npm run build

cd ../backend
npm test
node --check src/index.js
```

## Deployment

Deploy `backend/` as the Render service with start command `npm start`. Deploy `frontend/` as the Vercel project. Configure backend secrets in Render and public Firebase configuration in Vercel environment settings. Do not configure LiveKit or audio-call services.
