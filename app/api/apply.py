import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Dict
from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.profile import UserProfile
from app.models.resume import Resume
from app.models.job import Job, JobApplication, ApplicationStatus
from app.utils.auth import get_current_user
from app.utils.notifications import notification_manager
from app.agents.apply_agent import AutoApplyAgent
from loguru import logger
from datetime import datetime, timezone

router = APIRouter(prefix="/api/apply", tags=["Auto-Apply"])


class AnswerRequest(BaseModel):
    answers: Dict[str, str]


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await notification_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(user_id, websocket)


async def _run_apply_agent(application_id: int, user_id: int):
    async with AsyncSessionLocal() as db:
        app_result = await db.execute(
            select(JobApplication, Job, Resume, UserProfile, User)
            .join(Job, JobApplication.job_id == Job.id)
            .join(Resume, JobApplication.resume_id == Resume.id)
            .join(UserProfile, UserProfile.user_id == JobApplication.user_id)
            .join(User, User.id == JobApplication.user_id)
            .where(JobApplication.id == application_id)
        )
        row = app_result.first()
        if not row:
            logger.error(f"Application {application_id} not found")
            return

        application, job, resume, profile, user = row

        application.status = ApplicationStatus.IN_PROGRESS
        await db.commit()

        await notification_manager.notify_progress(
            user_id, application_id,
            f"🤖 AI agent starting application for {job.title} at {job.company}..."
        )

        profile_dict = {
            "full_name": user.full_name,
            "email": user.email,
            "domain": profile.domain,
            "experience_level": profile.experience_level,
            "skills": profile.skills or [],
            "projects": profile.projects or [],
            "linkedin_url": profile.linkedin_url,
            "github_url": profile.github_url,
            "portfolio_url": profile.portfolio_url,
            "location": profile.location,
            "target_roles": profile.target_roles or [],
        }

        user_answers = {}
        if application.pending_questions:
            for qa in application.pending_questions:
                if "answer" in qa:
                    user_answers[qa["field"]] = qa["answer"]

        async def notify_callback(question: str, field: str):
            await notification_manager.notify_needs_info(user_id, application_id, question, field)

        agent = AutoApplyAgent()
        result = await agent.apply(
            application_url=job.application_url,
            profile=profile_dict,
            resume_text=resume.raw_text or "",
            user_answers=user_answers,
            resume_file_path=resume.file_path,
            notify_callback=notify_callback,
        )

        if result["status"] == "applied":
            application.status = ApplicationStatus.APPLIED
            application.applied_at = datetime.fromisoformat(result["applied_at"])
            await notification_manager.notify_applied(user_id, application_id, job.title, job.company)

        elif result["status"] == "needs_info":
            application.status = ApplicationStatus.NEEDS_INFO
            existing_qs = application.pending_questions or []
            for q in result["needs_info"]:
                if not any(eq["field"] == q["field"] for eq in existing_qs):
                    existing_qs.append(q)
            application.pending_questions = existing_qs

        else:
            application.status = ApplicationStatus.FAILED
            await notification_manager.notify_failed(user_id, application_id, result.get("error", "Unknown error"))

        await db.commit()
        logger.info(f"Application {application_id} finished with status: {result['status']}")


@router.post("/start/{application_id}")
async def start_apply(
    application_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application.status == ApplicationStatus.APPLIED:
        raise HTTPException(status_code=400, detail="Already applied to this job.")

    if application.status == ApplicationStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Application is already in progress.")

    background_tasks.add_task(_run_apply_agent, application_id, current_user.id)

    return {
        "message": "AI agent started! Connect to WebSocket /api/apply/ws/{user_id} for real-time updates.",
        "application_id": application_id,
        "status": "in_progress",
    }


@router.post("/answer/{application_id}")
async def answer_questions(
    application_id: int,
    payload: AnswerRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application.status != ApplicationStatus.NEEDS_INFO:
        raise HTTPException(status_code=400, detail=f"Application is not awaiting answers (status: {application.status}).")

    updated_qs = application.pending_questions or []
    for question in updated_qs:
        field = question.get("field", "")
        if field in payload.answers:
            question["answer"] = payload.answers[field]

    application.pending_questions = updated_qs
    application.status = ApplicationStatus.PENDING
    await db.commit()

    background_tasks.add_task(_run_apply_agent, application_id, current_user.id)

    return {
        "message": "Answers received! AI agent resuming application...",
        "application_id": application_id,
        "answered_fields": list(payload.answers.keys()),
    }


@router.get("/status/{application_id}")
async def get_application_status(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication, Job)
        .join(Job, JobApplication.job_id == Job.id)
        .where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found.")

    application, job = row
    return {
        "application_id": application.id,
        "job_title": job.title,
        "company": job.company,
        "status": application.status,
        "applied_at": application.applied_at,
        "pending_questions": application.pending_questions,
        "email_updates": application.email_updates,
        "created_at": application.created_at,
    }
