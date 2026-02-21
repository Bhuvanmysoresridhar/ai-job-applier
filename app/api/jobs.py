from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.models.resume import Resume
from app.models.job import Job, JobApplication, ApplicationStatus
from app.utils.auth import get_current_user
from app.scrapers.job_scraper import JobScraper
from app.agents.job_matcher import JobMatcherAgent
from loguru import logger
from datetime import datetime, timezone

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/discover")
async def discover_jobs(
    location: str = Query("United States", description="Preferred job location"),
    max_results: int = Query(10, ge=1, le=25, description="Number of top job matches to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your profile setup first.")

    resume_result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id, Resume.is_active == True, Resume.is_approved == True)
    )
    approved_resume = resume_result.scalars().first()
    resume_text = approved_resume.raw_text or "" if approved_resume else ""

    logger.info(f"Discovering jobs for user {current_user.id} | domain={profile.domain}")

    scraper = JobScraper()
    raw_jobs = await scraper.search_jobs(
        domain=profile.domain,
        skills=profile.skills,
        location=location,
        experience_level=profile.experience_level,
        max_per_source=15,
    )

    if not raw_jobs:
        return {"message": "No jobs found at this time. Try again later.", "jobs": [], "total": 0}

    matcher = JobMatcherAgent()
    scored_jobs = await matcher.batch_score_jobs(raw_jobs, profile, resume_text, top_n=max_results)

    for job_data in scored_jobs:
        existing = await db.execute(
            select(Job).where(Job.application_url == job_data["application_url"])
        )
        if not existing.scalar_one_or_none():
            job = Job(
                title=job_data["title"],
                company=job_data["company"],
                location=job_data["location"],
                job_type=job_data["job_type"],
                description=job_data["description"],
                requirements=job_data["requirements"],
                application_url=job_data["application_url"],
                source=job_data["source"],
                posted_at=datetime.fromisoformat(job_data["posted_at"]) if job_data.get("posted_at") else None,
                match_keywords=job_data.get("keywords_matched", []),
            )
            db.add(job)

    await db.commit()

    return {
        "total": len(scored_jobs),
        "jobs": scored_jobs,
        "profile_domain": profile.domain,
        "experience_level": profile.experience_level,
    }


@router.get("/my-applications")
async def my_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication, Job)
        .join(Job, JobApplication.job_id == Job.id)
        .where(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "application_id": app.id,
            "job_title": job.title,
            "company": job.company,
            "location": job.location,
            "status": app.status,
            "match_score": app.match_score,
            "applied_at": app.applied_at,
            "created_at": app.created_at,
            "email_updates": app.email_updates,
            "pending_questions": app.pending_questions,
            "application_url": job.application_url,
        }
        for app, job in rows
    ]


@router.post("/{job_id}/queue")
async def queue_application(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    existing = await db.execute(
        select(JobApplication).where(
            JobApplication.user_id == current_user.id,
            JobApplication.job_id == job_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already queued or applied to this job.")

    resume_result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id, Resume.is_approved == True, Resume.is_active == True)
    )
    approved_resume = resume_result.scalars().first()
    if not approved_resume:
        raise HTTPException(status_code=400, detail="No approved resume found. Please upload and analyze your resume first.")

    application = JobApplication(
        user_id=current_user.id,
        job_id=job_id,
        resume_id=approved_resume.id,
        status=ApplicationStatus.PENDING,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    return {
        "message": f"Job '{job.title}' at {job.company} queued for auto-apply!",
        "application_id": application.id,
        "status": application.status,
        "note": "The AI agent will begin applying shortly. You'll be notified if any info is needed.",
    }


@router.get("/saved")
async def get_saved_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.is_active == True).order_by(Job.scraped_at.desc()).limit(50))
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "location": j.location,
            "job_type": j.job_type,
            "source": j.source,
            "application_url": j.application_url,
            "scraped_at": j.scraped_at,
        }
        for j in jobs
    ]
