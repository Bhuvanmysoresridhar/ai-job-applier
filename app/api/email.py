from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.models.job import JobApplication, ApplicationStatus, Job
from app.utils.auth import get_current_user
from app.utils.gmail import get_gmail_auth_url, exchange_code_for_token, fetch_recent_emails, mark_as_read
from app.agents.email_agent import EmailAgent, EmailClassification
from app.utils.notifications import notification_manager
from loguru import logger
import json

router = APIRouter(prefix="/api/email", tags=["Email Intelligence"])


@router.get("/connect")
async def connect_gmail(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.config import settings
    if not settings.GMAIL_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Gmail API not configured. Add GMAIL_CLIENT_ID to .env")

    auth_url = get_gmail_auth_url(current_user.id)
    return {"auth_url": auth_url, "message": "Visit the auth_url to connect your Gmail inbox."}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user_id = int(state)
    token_dict = exchange_code_for_token(code)

    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found.")

    profile.gmail_token = json.dumps(token_dict)
    profile.gmail_connected = "true"
    await db.commit()

    return {"message": "Gmail connected successfully! Email monitoring is now active."}


@router.post("/scan")
async def scan_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = profile_result.scalar_one_or_none()

    if not profile or profile.gmail_connected != "true" or not profile.gmail_token:
        raise HTTPException(status_code=400, detail="Gmail not connected. Use /api/email/connect first.")

    token_dict = json.loads(profile.gmail_token)
    emails = fetch_recent_emails(token_dict, max_results=20, query="is:unread")

    if not emails:
        return {"message": "No new emails found.", "processed": 0, "updates": []}

    apps_result = await db.execute(
        select(JobApplication, Job)
        .join(Job, JobApplication.job_id == Job.id)
        .where(JobApplication.user_id == current_user.id)
    )
    applications = [
        {"application_id": app.id, "job_title": job.title, "company": job.company}
        for app, job in apps_result.all()
    ]

    agent = EmailAgent()
    updates = []

    for email in emails:
        try:
            classification = await agent.classify_email(
                subject=email["subject"],
                body=email["body"],
                sender=email["sender"],
            )

            if not classification.get("is_job_related") or classification.get("confidence", 0) < 0.5:
                continue

            matched_app_id = await agent.match_email_to_application(
                {**classification, "subject": email["subject"], "sender": email["sender"]},
                applications,
            )

            email_update = {
                "email_id": email["id"],
                "subject": email["subject"],
                "sender": email["sender"],
                "date": email["date"],
                "classification": classification["classification"],
                "summary": classification["summary"],
                "key_info": classification.get("key_info", {}),
                "action_required": classification.get("action_required", False),
                "action_description": classification.get("action_description"),
            }

            if matched_app_id:
                app_result = await db.execute(select(JobApplication).where(JobApplication.id == matched_app_id))
                application = app_result.scalar_one_or_none()
                if application:
                    existing_updates = application.email_updates or []
                    if not any(u.get("email_id") == email["id"] for u in existing_updates):
                        existing_updates.append(email_update)
                        application.email_updates = existing_updates

                        if classification["classification"] == EmailClassification.REJECTION:
                            application.status = ApplicationStatus.REJECTED
                        elif classification["classification"] == EmailClassification.INTERVIEW_SCHEDULED:
                            application.status = ApplicationStatus.INTERVIEW_SCHEDULED
                        elif classification["classification"] == EmailClassification.OFFER:
                            application.status = ApplicationStatus.OFFER_RECEIVED

                        await notification_manager.send_to_user(current_user.id, {
                            "type": "email_update",
                            "application_id": matched_app_id,
                            "classification": classification["classification"],
                            "message": f"📧 {classification['summary']}",
                            "action_required": classification.get("action_required", False),
                            "action_description": classification.get("action_description"),
                        })

            mark_as_read(token_dict, email["id"])
            updates.append({**email_update, "matched_application_id": matched_app_id})

        except Exception as e:
            logger.error(f"Error processing email {email['id']}: {e}")
            continue

    await db.commit()

    return {
        "processed": len(emails),
        "job_related": len(updates),
        "updates": updates,
    }


@router.get("/updates")
async def get_email_updates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication, Job)
        .join(Job, JobApplication.job_id == Job.id)
        .where(
            JobApplication.user_id == current_user.id,
            JobApplication.email_updates != None,
        )
        .order_by(JobApplication.updated_at.desc())
    )
    rows = result.all()

    all_updates = []
    for app, job in rows:
        for update in (app.email_updates or []):
            all_updates.append({
                "application_id": app.id,
                "job_title": job.title,
                "company": job.company,
                "application_status": app.status,
                **update,
            })

    all_updates.sort(key=lambda x: x.get("date", ""), reverse=True)
    return {"total": len(all_updates), "updates": all_updates}
