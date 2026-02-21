import pdfplumber
import json
from openai import AsyncOpenAI
from app.config import settings


class ResumeAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    def _extract_text(self, file_path: str) -> str:
        if file_path.endswith(".pdf"):
            with pdfplumber.open(file_path) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        return ""

    async def analyze(self, file_path: str, profile=None) -> dict:
        raw_text = self._extract_text(file_path)

        profile_context = ""
        if profile:
            profile_context = f"""
Student Profile:
- Domain: {profile.domain}
- Experience Level: {profile.experience_level}
- Skills: {", ".join(profile.skills or [])}
- Target Roles: {", ".join(profile.target_roles or [])}
"""

        prompt = f"""You are an expert resume reviewer and career coach specializing in helping students land jobs.

{profile_context}

Analyze the following resume and provide structured feedback:

RESUME:
{raw_text}

Provide your analysis in the following JSON format ONLY (no other text):
{{
    "score": <integer 0-100>,
    "overall_assessment": "<brief 2-3 sentence summary>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
    "feedback": {{
        "formatting": "<feedback on formatting>",
        "content": "<feedback on content quality>",
        "keywords": "<feedback on relevant keywords for ATS>",
        "impact": "<feedback on quantified achievements>",
        "skills_alignment": "<how well skills match the target domain>"
    }},
    "suggestions": [
        {{
            "priority": "high|medium|low",
            "section": "<resume section>",
            "issue": "<what is wrong>",
            "fix": "<how to fix it>"
        }}
    ],
    "ats_score": <integer 0-100>,
    "ready_to_apply": <true|false>
}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        result["raw_text"] = raw_text
        return result

    async def generate_cover_letter(self, resume_text: str, job_description: str, user_name: str, company: str, role: str) -> str:
        prompt = f"""You are an expert career coach. Write a compelling, personalized cover letter.

Candidate: {user_name}
Applying for: {role} at {company}

Resume Summary:
{resume_text[:2000]}

Job Description:
{job_description[:2000]}

Write a professional cover letter (3-4 paragraphs) that:
1. Opens with a strong hook related to the company/role
2. Highlights the most relevant experience and projects
3. Shows genuine enthusiasm and cultural fit
4. Ends with a clear call to action

Keep it concise (under 400 words). Do not use generic phrases like "I am writing to express my interest"."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content
