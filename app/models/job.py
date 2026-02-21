from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPLIED = "applied"
    NEEDS_INFO = "needs_info"
    FAILED = "failed"
    REJECTED = "rejected"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    OFFER_RECEIVED = "offer_received"
    WITHDRAWN = "withdrawn"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    job_type = Column(String(100), nullable=True)
    experience_required = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    requirements = Column(JSON, default=list)
    application_url = Column(String(1000), nullable=False)
    source = Column(String(100), nullable=True)
    posted_at = Column(DateTime, nullable=True)
    scraped_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    match_keywords = Column(JSON, default=list)

    applications = relationship("JobApplication", back_populates="job")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)

    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)
    match_score = Column(Integer, nullable=True)
    cover_letter = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    pending_questions = Column(JSON, default=list)
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    email_updates = Column(JSON, default=list)

    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
