import asyncio
import json
from typing import Optional
from datetime import datetime, timezone
from playwright.async_api import async_playwright, Page, Browser
from openai import AsyncOpenAI
from loguru import logger
from app.config import settings


class NeedsInfoException(Exception):
    def __init__(self, question: str, field_label: str):
        self.question = question
        self.field_label = field_label
        super().__init__(question)


class AutoApplyAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    async def _get_page_context(self, page: Page) -> str:
        inputs = await page.query_selector_all("input, textarea, select")
        fields = []
        for inp in inputs[:30]:
            label = await inp.get_attribute("placeholder") or ""
            name = await inp.get_attribute("name") or ""
            input_type = await inp.get_attribute("type") or "text"
            aria_label = await inp.get_attribute("aria-label") or ""
            is_visible = await inp.is_visible()
            if is_visible and input_type not in ("hidden", "submit", "button"):
                fields.append(f"- [{input_type}] name='{name}' label='{label or aria_label}'")
        return "\n".join(fields) if fields else "No visible input fields found."

    async def _ai_fill_decision(self, field_label: str, field_type: str, profile: dict, resume_text: str, user_answers: dict) -> dict:
        if field_label.lower() in [k.lower() for k in user_answers]:
            matched_key = next(k for k in user_answers if k.lower() == field_label.lower())
            return {"action": "fill", "value": user_answers[matched_key]}

        prompt = f"""You are an AI agent filling out a job application form on behalf of a student.

Student Profile:
{json.dumps(profile, indent=2)}

Resume excerpt:
{resume_text[:1500]}

Previously answered questions:
{json.dumps(user_answers, indent=2)}

Current form field:
- Label/Name: {field_label}
- Field type: {field_type}

Decide what to do with this field. Return JSON only:
{{
    "action": "fill|skip|needs_info",
    "value": "<value to fill if action is fill>",
    "question": "<question to ask the student if action is needs_info>"
}}

Rules:
- "fill" if you can confidently answer from the profile/resume
- "skip" if the field is optional and you don't have data (e.g., website, middle name)
- "needs_info" ONLY if the field is required and you truly cannot answer (e.g., specific password, secret question, very specific salary expectation)
- For checkboxes like "agree to terms": fill with "true"
- For name fields: use full name from profile
- For email: use email from profile
- For experience years: derive from experience_level (fresher=0, entry_level=1, mid_level=3)"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    async def _detect_success(self, page: Page, original_url: str) -> bool:
        current_url = page.url
        if current_url != original_url and any(kw in current_url.lower() for kw in ["success", "thank", "confirm", "submitted"]):
            return True
        content = (await page.content()).lower()
        success_phrases = ["application submitted", "thank you for applying", "we've received your application",
                           "application received", "successfully applied", "application complete"]
        return any(phrase in content for phrase in success_phrases)

    async def apply(
        self,
        application_url: str,
        profile: dict,
        resume_text: str,
        user_answers: dict = None,
        resume_file_path: str = None,
        notify_callback=None,
    ) -> dict:
        user_answers = user_answers or {}
        result = {
            "status": "failed",
            "applied_at": None,
            "needs_info": [],
            "error": None,
            "screenshot": None,
        }

        try:
            async with async_playwright() as p:
                browser: Browser = await p.chromium.launch(headless=False, slow_mo=500)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                )
                page = await context.new_page()

                logger.info(f"Navigating to: {application_url}")
                await page.goto(application_url, wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)

                needs_info_questions = []
                max_steps = 10

                for step in range(max_steps):
                    logger.info(f"Auto-apply step {step + 1}")
                    page_context = await self._get_page_context(page)
                    inputs = await page.query_selector_all("input:visible, textarea:visible, select:visible")

                    filled_count = 0
                    for inp in inputs[:20]:
                        try:
                            field_label = (
                                await inp.get_attribute("placeholder") or
                                await inp.get_attribute("aria-label") or
                                await inp.get_attribute("name") or
                                "unknown_field"
                            )
                            field_type = await inp.get_attribute("type") or "text"

                            if field_type in ("hidden", "submit", "button", "file"):
                                if field_type == "file" and resume_file_path:
                                    await inp.set_input_files(resume_file_path)
                                    filled_count += 1
                                continue

                            current_value = await inp.input_value()
                            if current_value:
                                continue

                            decision = await self._ai_fill_decision(field_label, field_type, profile, resume_text, user_answers)

                            if decision["action"] == "fill":
                                value = str(decision.get("value", ""))
                                if field_type == "checkbox":
                                    if value.lower() in ("true", "yes", "1"):
                                        await inp.check()
                                elif field_type == "select":
                                    await inp.select_option(label=value)
                                else:
                                    await inp.fill(value)
                                    await asyncio.sleep(0.3)
                                filled_count += 1
                                logger.debug(f"Filled '{field_label}' = '{value[:30]}'")

                            elif decision["action"] == "needs_info":
                                question = decision.get("question", f"What should I enter for '{field_label}'?")
                                needs_info_questions.append({
                                    "field": field_label,
                                    "question": question,
                                })
                                if notify_callback:
                                    await notify_callback(question, field_label)
                                logger.info(f"Needs info for field: {field_label}")

                        except Exception as e:
                            logger.debug(f"Error filling field {field_label}: {e}")
                            continue

                    if needs_info_questions:
                        result["status"] = "needs_info"
                        result["needs_info"] = needs_info_questions
                        await browser.close()
                        return result

                    submit_btn = await page.query_selector("button[type='submit'], input[type='submit'], button:has-text('Submit'), button:has-text('Apply'), button:has-text('Send Application')")
                    if submit_btn:
                        await submit_btn.click()
                        await asyncio.sleep(3)

                        if await self._detect_success(page, application_url):
                            result["status"] = "applied"
                            result["applied_at"] = datetime.now(timezone.utc).isoformat()
                            logger.info("✅ Application submitted successfully!")
                            break

                    next_btn = await page.query_selector("button:has-text('Next'), button:has-text('Continue'), a:has-text('Next')")
                    if next_btn:
                        await next_btn.click()
                        await asyncio.sleep(2)
                    elif filled_count == 0:
                        logger.info("No more fields to fill. Application may be complete.")
                        result["status"] = "applied"
                        result["applied_at"] = datetime.now(timezone.utc).isoformat()
                        break

                await browser.close()

        except Exception as e:
            logger.error(f"Auto-apply error: {e}")
            result["error"] = str(e)
            result["status"] = "failed"

        return result
