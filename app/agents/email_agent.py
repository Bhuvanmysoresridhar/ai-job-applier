import json
import base64
from datetime import datetime, timezone
from typing import List, Optional
from openai import AsyncOpenAI
from loguru import logger
from app.config import settings


class EmailClassification:
    REJECTION = "rejection"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    ASSESSMENT = "assessment"
    FOLLOW_UP = "follow_up"
    OFFER = "offer"
    UNKNOWN = "unknown"


class EmailAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    async def classify_email(self, subject: str, body: str, sender: str) -> dict:
        prompt = f"""You are an AI that classifies job application-related emails for students.

Email Details:
- From: {sender}
- Subject: {subject}
- Body (first 2000 chars): {body[:2000]}

Classify this email and return JSON only:
{{
    "is_job_related": <true|false>,
    "classification": "rejection|interview_scheduled|assessment|follow_up|offer|unknown",
    "company_name": "<company name if identifiable, else null>",
    "confidence": <float 0.0-1.0>,
    "key_info": {{
        "interview_date": "<ISO date if interview scheduled, else null>",
        "interview_time": "<time if mentioned, else null>",
        "interview_format": "<phone|video|onsite|null>",
        "interview_link": "<URL if provided, else null>",
        "next_steps": "<what the student should do next>",
        "deadline": "<any deadline mentioned, else null>"
    }},
    "summary": "<1-2 sentence human-readable summary>",
    "action_required": <true|false>,
    "action_description": "<what action the student needs to take, if any>"
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Email classification error: {e}")
            return {
                "is_job_related": False,
                "classification": EmailClassification.UNKNOWN,
                "company_name": None,
                "confidence": 0.0,
                "key_info": {},
                "summary": "Unable to classify email",
                "action_required": False,
                "action_description": None,
            }

    async def match_email_to_application(self, email_data: dict, applications: List[dict]) -> Optional[int]:
        if not applications:
            return None

        company = email_data.get("company_name", "")
        subject = email_data.get("subject", "")
        sender = email_data.get("sender", "")

        for app in applications:
            job_title = app.get("job_title", "").lower()
            company_name = app.get("company", "").lower()

            if company and company.lower() in sender.lower():
                return app["application_id"]
            if company_name and company_name in subject.lower():
                return app["application_id"]
            if company and company.lower() == company_name:
                return app["application_id"]

        return None
