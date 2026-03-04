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

## Using with Ray-Ban Meta Glasses

Lab Assistant is designed for hands-free use with Ray-Ban Meta smart glasses. Once deployed to a public URL, you can control it entirely by voice.

### Setup

1. Deploy Lab Assistant to a public URL (see [Deploy to Railway](#deploy-to-railway) below)
2. Make sure your Ray-Ban Meta glasses are connected to the Meta View app on your phone
3. Open the app URL once on your phone's browser to allow microphone permissions

### Voice Commands

**Open the app:**
> "Hey Meta, open lab-assistant-production.up.railway.app"

The glasses will open the URL in the connected phone's browser.

**Start recording a measurement:**
> "Hey Meta, open lab-assistant-production.up.railway.app?action=record"

This opens the app and can trigger recording automatically (if microphone permission was previously granted).

### Typical Workflow

1. You're in the lab, hands full, wearing your Ray-Ban Meta glasses
2. Say **"Hey Meta, open [your-app-url]"** — the app opens on your phone
3. Tap record (or use the `?action=record` URL to auto-start)
4. Speak your measurements naturally:
   - *"Sample A, five point three milliliters at twenty-two degrees Celsius"*
   - *"Voltage reading is three point seven volts, current fifteen milliamps"*
   - *"Pressure holding steady at one hundred and two kilopascals"*
5. Stop recording — Whisper transcribes your audio and automatically extracts all values and units
6. Review, filter, and export your measurements later from the dashboard

### Supported Measurements

Lab Assistant recognizes **100+ physical units** across these categories:

| Category | Units |
|----------|-------|
| Volume | mL, μL, L, gal |
| Mass | μg, mg, g, kg, lb, oz, t |
| Length | nm, μm, mm, cm, m, km, in, ft, yd, mi |
| Temperature | °C, °F, K |
| Pressure | Pa, kPa, MPa, hPa, atm, bar, psi, mmHg, Torr |
| Power | mW, W, kW, MW, GW, hp |
| Energy | mJ, J, kJ, MJ, cal, kcal, Wh, kWh, eV |
| Electrical | mV, V, kV, μA, mA, A, Ω, kΩ, MΩ, pF, nF, μF, F, mH, H |
| Frequency | Hz, kHz, MHz, GHz, rpm |
| Force | N, kN, MN, lbf |
| Speed | m/s, km/h, mph, knot |
| Concentration | pH, M, ppm, ppb |
| Magnetic | T, mT, G, Wb |
| Sound | dB |
| Radiation | Sv, mSv, Gy, Bq |
| Light | lm, lx, cd |
| And more | Nm, L/min, %, mm², m², ha, cP, kg/m³, ... |

### Tips

- Speak clearly and include the unit name — "five megawatts" works, "five MW" also works
- You can use full names ("milliliters") or abbreviations ("mL")
- Spoken numbers work too — "twenty-two degrees Celsius" is extracted as `22 °C`
- Record multiple measurements in one go — they'll all be extracted automatically

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
