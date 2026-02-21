from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.profile import UserProfile, JobDomain, ExperienceLevel
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])


class ProjectItem(BaseModel):
    name: str
    description: str
    tech_stack: List[str] = []
    url: Optional[str] = None


class ProfileCreateRequest(BaseModel):
    domain: JobDomain
    experience_level: ExperienceLevel
    skills: List[str] = []
    projects: List[ProjectItem] = []
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    target_roles: List[str] = []
    preferred_job_types: List[str] = []


class ProfileUpdateRequest(BaseModel):
    domain: Optional[JobDomain] = None
    experience_level: Optional[ExperienceLevel] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[ProjectItem]] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    target_roles: Optional[List[str]] = None
    preferred_job_types: Optional[List[str]] = None


@router.post("/setup")
async def setup_profile(
    payload: ProfileCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PATCH /api/profile to update.")

    profile = UserProfile(
        user_id=current_user.id,
        domain=payload.domain,
        experience_level=payload.experience_level,
        skills=payload.skills,
        projects=[p.model_dump() for p in payload.projects],
        bio=payload.bio,
        linkedin_url=payload.linkedin_url,
        github_url=payload.github_url,
        portfolio_url=payload.portfolio_url,
        location=payload.location,
        target_roles=payload.target_roles,
        preferred_job_types=payload.preferred_job_types,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"message": "Profile created successfully", "profile_id": profile.id}


@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete setup first.")
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "domain": profile.domain,
        "experience_level": profile.experience_level,
        "skills": profile.skills,
        "projects": profile.projects,
        "bio": profile.bio,
        "linkedin_url": profile.linkedin_url,
        "github_url": profile.github_url,
        "portfolio_url": profile.portfolio_url,
        "location": profile.location,
        "target_roles": profile.target_roles,
        "preferred_job_types": profile.preferred_job_types,
        "gmail_connected": profile.gmail_connected,
    }


@router.patch("/me")
async def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please setup first.")

    update_data = payload.model_dump(exclude_none=True)
    if "projects" in update_data:
        update_data["projects"] = [p if isinstance(p, dict) else p for p in update_data["projects"]]

    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return {"message": "Profile updated successfully"}
