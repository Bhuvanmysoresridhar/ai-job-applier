from sqlalchemy import Column, Integer, String, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class ExperienceLevel(str, enum.Enum):
    FRESHER = "fresher"
    INTERNSHIP = "internship"
    ENTRY_LEVEL = "entry_level"
    MID_LEVEL = "mid_level"


class JobDomain(str, enum.Enum):
    SOFTWARE_ENGINEERING = "software_engineering"
    DATA_SCIENCE = "data_science"
    MACHINE_LEARNING = "machine_learning"
    DEVOPS = "devops"
    PRODUCT_MANAGEMENT = "product_management"
    UI_UX = "ui_ux"
    CYBERSECURITY = "cybersecurity"
    CLOUD_ENGINEERING = "cloud_engineering"
    FULL_STACK = "full_stack"
    FRONTEND = "frontend"
    BACKEND = "backend"
    MOBILE = "mobile"
    EMBEDDED = "embedded"
    QA_TESTING = "qa_testing"
    OTHER = "other"


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    domain = Column(Enum(JobDomain), nullable=False)
    experience_level = Column(Enum(ExperienceLevel), nullable=False)

    skills = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    bio = Column(Text, nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    target_roles = Column(JSON, default=list)
    preferred_job_types = Column(JSON, default=list)

    gmail_token = Column(Text, nullable=True)
    gmail_connected = Column(String(5), default="false")

    user = relationship("User", back_populates="profile")
