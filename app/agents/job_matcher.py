import json
from openai import AsyncOpenAI
from app.config import settings
from app.scrapers.job_scraper import ScrapedJob
from typing import List


class JobMatcherAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    async def score_job(self, job: ScrapedJob, profile, resume_text: str = "") -> dict:
        profile_summary = f"""
Student Profile:
- Name: {getattr(profile, 'user', None) and profile.user.full_name or 'Student'}
- Domain: {profile.domain}
- Experience Level: {profile.experience_level}
- Skills: {", ".join(profile.skills or [])}
- Target Roles: {", ".join(profile.target_roles or [])}
- Projects: {len(profile.projects or [])} project(s)
"""
        if resume_text:
            profile_summary += f"\nResume Excerpt:\n{resume_text[:1500]}"

        job_info = f"""
Job Title: {job.title}
Company: {job.company}
Location: {job.location}
Type: {job.job_type}
Description: {job.description[:1000]}
Requirements: {", ".join(job.requirements[:10]) if job.requirements else "N/A"}
"""

        prompt = f"""You are a career counselor AI that matches students to job opportunities.

{profile_summary}

{job_info}

Analyze how well this job matches the student's profile. Return JSON only:
{{
    "match_score": <integer 0-100>,
    "match_reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
    "missing_skills": ["<skill they lack>"],
    "apply_recommendation": "strong_match|good_match|stretch_goal|not_recommended",
    "summary": "<1-2 sentence summary of fit>",
    "keywords_matched": ["<keyword 1>", "<keyword 2>"]
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {
                "match_score": 50,
                "match_reasons": ["Unable to fully analyze"],
                "missing_skills": [],
                "apply_recommendation": "good_match",
                "summary": f"AI analysis unavailable: {str(e)}",
                "keywords_matched": [],
            }

    async def batch_score_jobs(self, jobs: List[ScrapedJob], profile, resume_text: str = "", top_n: int = 10) -> List[dict]:
        import asyncio

        async def score_one(job):
            result = await self.score_job(job, profile, resume_text)
            return {
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "job_type": job.job_type,
                "description": job.description,
                "application_url": job.application_url,
                "source": job.source,
                "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                "requirements": job.requirements,
                "match_score": result.get("match_score", 0),
                "match_reasons": result.get("match_reasons", []),
                "missing_skills": result.get("missing_skills", []),
                "apply_recommendation": result.get("apply_recommendation", "good_match"),
                "match_summary": result.get("summary", ""),
                "keywords_matched": result.get("keywords_matched", []),
            }

        scored = await asyncio.gather(*[score_one(job) for job in jobs[:20]], return_exceptions=True)
        valid = [s for s in scored if isinstance(s, dict)]
        valid.sort(key=lambda x: x["match_score"], reverse=True)
        return valid[:top_n]
