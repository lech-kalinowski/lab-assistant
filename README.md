# Lab Assistant

Voice-powered measurement tracking for Ray-Ban Meta smart glasses.

Speak your lab measurements hands-free — Lab Assistant transcribes audio with Whisper, automatically extracts numeric values and units, and stores everything in a searchable database.

## Features

- **Voice Recording** — Record audio directly in the browser or upload audio files (.wav, .mp3, .m4a, .webm, .ogg, .flac)
- **AI Transcription** — Whisper-powered speech-to-text (runs on CPU, no GPU needed)
- **Measurement Extraction** — Automatically detects values + units from transcripts (supports mL, mg, °C, pH, ppm, rpm, and many more)
- **Search & Filter** — Browse all measurements by unit, value range
- **CSV Export** — Download all measurements as a spreadsheet
- **PWA** — Installable as a standalone app with offline support
- **Ray-Ban Meta Integration** — "Hey Meta, open [your-url]" for hands-free lab work

## Tech Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 19, Vite 7, Tailwind CSS 4          |
| Backend  | FastAPI, SQLAlchemy, Pydantic              |
| AI       | faster-whisper (CTranslate2, base model)   |
| Database | SQLite (configurable via `DATABASE_URL`)   |
| Deploy   | Docker, Railway                            |

## Quick Start

### Local Development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Docker

```bash
docker build -t lab-assistant .
docker run -p 8000:8000 lab-assistant
```

Open http://localhost:8000

## API Endpoints

| Method   | Endpoint                    | Description                        |
|----------|-----------------------------|------------------------------------|
| `GET`    | `/api/health`               | Health check                       |
| `POST`   | `/api/upload`               | Upload audio → transcribe → extract |
| `GET`    | `/api/recordings`           | List all recordings                |
| `GET`    | `/api/recordings/:id`       | Get recording with measurements    |
| `DELETE` | `/api/recordings/:id`       | Delete a recording                 |
| `GET`    | `/api/measurements`         | List measurements (filterable)     |
| `GET`    | `/api/export/csv`           | Export measurements as CSV         |

## Deploy to Railway

1. Push to GitHub
2. Connect the repo in [Railway dashboard](https://railway.com/new)
3. Railway auto-detects the Dockerfile and deploys
4. Get your `*.up.railway.app` URL

Set `DATABASE_URL` env var for persistent storage (defaults to SQLite).

## Project Structure

```
├── backend/
│   ├── main.py           # FastAPI app + static file serving
│   ├── database.py       # SQLAlchemy setup
│   ├── models.py         # Recording & Measurement models
│   └── extractor.py      # Regex-based measurement extraction
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Router with 3 tabs
│   │   ├── api.js        # API client
│   │   └── pages/        # Upload, Recordings, Measurements
│   └── public/           # PWA manifest, service worker, icons
├── Dockerfile            # Multi-stage build (Node + Python)
├── railway.json          # Railway config
└── README.md
```

## License

MIT
