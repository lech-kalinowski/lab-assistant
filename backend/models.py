from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Float, nullable=True)
    full_transcript = Column(Text, nullable=True)

    measurements = relationship(
        "Measurement", back_populates="recording", cascade="all, delete-orphan"
    )


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    raw_text = Column(String, nullable=True)
    context = Column(Text, nullable=True)
    timestamp_in_audio = Column(Float, nullable=True)
    extracted_at = Column(DateTime, default=datetime.utcnow)

    recording = relationship("Recording", back_populates="measurements")
