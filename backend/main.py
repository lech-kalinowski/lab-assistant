import csv
import io
import os
import tempfile
from datetime import datetime
from pathlib import Path

from faster_whisper import WhisperModel
from fastapi import FastAPI, Request, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Recording, Measurement
from extractor import extract_measurements

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReyBan Meta Lab", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}

# Load Whisper model once at startup
whisper_model = None


def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return whisper_model


@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Supported: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Save uploaded file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=UPLOAD_DIR) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Transcribe with Whisper
        model = get_whisper_model()
        segments, info = model.transcribe(tmp_path)
        segments_list = list(segments)
        transcript = " ".join(seg.text.strip() for seg in segments_list)
        duration = segments_list[-1].end if segments_list else None

        # Create recording record
        recording = Recording(
            filename=file.filename or "unknown",
            duration_seconds=duration,
            full_transcript=transcript,
        )
        db.add(recording)
        db.flush()

        # Extract measurements
        extracted = extract_measurements(transcript)
        for m in extracted:
            measurement = Measurement(
                recording_id=recording.id,
                value=m.value,
                unit=m.unit,
                raw_text=m.raw_text,
                context=m.context,
            )
            db.add(measurement)

        db.commit()
        db.refresh(recording)

        return {
            "id": recording.id,
            "filename": recording.filename,
            "duration_seconds": recording.duration_seconds,
            "transcript": transcript,
            "measurements_count": len(extracted),
            "measurements": [
                {"value": m.value, "unit": m.unit, "raw_text": m.raw_text, "context": m.context}
                for m in extracted
            ],
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/api/recordings")
def list_recordings(db: Session = Depends(get_db)):
    recordings = db.query(Recording).order_by(Recording.uploaded_at.desc()).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
            "duration_seconds": r.duration_seconds,
            "measurements_count": len(r.measurements),
        }
        for r in recordings
    ]


@app.get("/api/recordings/{recording_id}")
def get_recording(recording_id: int, db: Session = Depends(get_db)):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    return {
        "id": recording.id,
        "filename": recording.filename,
        "uploaded_at": recording.uploaded_at.isoformat() if recording.uploaded_at else None,
        "duration_seconds": recording.duration_seconds,
        "full_transcript": recording.full_transcript,
        "measurements": [
            {
                "id": m.id,
                "value": m.value,
                "unit": m.unit,
                "raw_text": m.raw_text,
                "context": m.context,
                "timestamp_in_audio": m.timestamp_in_audio,
                "extracted_at": m.extracted_at.isoformat() if m.extracted_at else None,
            }
            for m in recording.measurements
        ],
    }


@app.get("/api/measurements")
def list_measurements(
    unit: str | None = Query(None),
    min_value: float | None = Query(None),
    max_value: float | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Measurement)

    if unit:
        query = query.filter(Measurement.unit == unit)
    if min_value is not None:
        query = query.filter(Measurement.value >= min_value)
    if max_value is not None:
        query = query.filter(Measurement.value <= max_value)

    measurements = query.order_by(Measurement.extracted_at.desc()).all()
    return [
        {
            "id": m.id,
            "recording_id": m.recording_id,
            "value": m.value,
            "unit": m.unit,
            "raw_text": m.raw_text,
            "context": m.context,
            "timestamp_in_audio": m.timestamp_in_audio,
            "extracted_at": m.extracted_at.isoformat() if m.extracted_at else None,
        }
        for m in measurements
    ]


@app.get("/api/export/csv")
def export_csv(db: Session = Depends(get_db)):
    measurements = (
        db.query(Measurement, Recording.filename)
        .join(Recording, Measurement.recording_id == Recording.id)
        .order_by(Measurement.extracted_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "recording_id", "filename", "value", "unit", "raw_text", "context", "extracted_at"])

    for m, filename in measurements:
        writer.writerow([
            m.id,
            m.recording_id,
            filename,
            m.value,
            m.unit,
            m.raw_text,
            m.context,
            m.extracted_at.isoformat() if m.extracted_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=measurements_export.csv"},
    )


@app.delete("/api/recordings/{recording_id}")
def delete_recording(recording_id: int, db: Session = Depends(get_db)):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    db.delete(recording)
    db.commit()
    return {"detail": "Recording deleted"}


# --- Serve frontend static files (production) ---
FRONTEND_DIR = Path(__file__).parent / "frontend_dist"

if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve frontend files, falling back to index.html for SPA routing."""
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
