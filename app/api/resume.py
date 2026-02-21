import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.utils.auth import get_current_user
from app.agents.resume_agent import ResumeAgent

router = APIRouter(prefix="/api/resume", tags=["Resume"])

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith((".pdf", ".docx", ".doc")):
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are supported.")

    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(file_path)

    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        is_active=True,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return {
        "message": "Resume uploaded successfully. Use /api/resume/{id}/analyze to get AI feedback.",
        "resume_id": resume.id,
        "filename": resume.filename,
    }


@router.post("/{resume_id}/analyze")
async def analyze_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    from app.models.profile import UserProfile
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = profile_result.scalar_one_or_none()

    agent = ResumeAgent()
    analysis = await agent.analyze(resume.file_path, profile)

    resume.raw_text = analysis.get("raw_text", "")
    resume.ai_score = analysis.get("score", 0)
    resume.ai_feedback = analysis.get("feedback", {})
    resume.improvement_suggestions = analysis.get("suggestions", [])
    resume.is_approved = analysis.get("score", 0) >= 70

    await db.commit()
    await db.refresh(resume)

    return {
        "resume_id": resume.id,
        "score": resume.ai_score,
        "is_approved": resume.is_approved,
        "feedback": resume.ai_feedback,
        "suggestions": resume.improvement_suggestions,
        "message": "Resume is ready for job applications!" if resume.is_approved else "Please improve your resume based on the suggestions.",
    }


@router.get("/my-resumes")
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id, Resume.is_active == True)
    )
    resumes = result.scalars().all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "ai_score": r.ai_score,
            "is_approved": r.is_approved,
            "created_at": r.created_at,
        }
        for r in resumes
    ]


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    resume.is_active = False
    await db.commit()
    return {"message": "Resume deleted successfully."}
