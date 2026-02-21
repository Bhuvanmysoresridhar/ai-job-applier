import asyncio
import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from typing import List, Optional
from loguru import logger
from dataclasses import dataclass


@dataclass
class ScrapedJob:
    title: str
    company: str
    location: str
    job_type: str
    description: str
    application_url: str
    source: str
    posted_at: Optional[datetime] = None
    experience_required: Optional[str] = None
    requirements: List[str] = None

    def __post_init__(self):
        if self.requirements is None:
            self.requirements = []


class IndeedScraper:
    BASE_URL = "https://www.indeed.com/jobs"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    async def search(self, query: str, location: str = "United States", max_results: int = 20) -> List[ScrapedJob]:
        jobs = []
        params = {"q": query, "l": location, "limit": min(max_results, 50), "fromage": 14}

        try:
            async with httpx.AsyncClient(headers=self.HEADERS, follow_redirects=True, timeout=30) as client:
                response = await client.get(self.BASE_URL, params=params)
                if response.status_code != 200:
                    logger.warning(f"Indeed returned {response.status_code}")
                    return jobs

                soup = BeautifulSoup(response.text, "lxml")
                job_cards = soup.find_all("div", {"class": lambda c: c and "job_seen_beacon" in c})

                for card in job_cards[:max_results]:
                    try:
                        title_el = card.find("h2", {"class": lambda c: c and "jobTitle" in c})
                        title = title_el.get_text(strip=True) if title_el else "N/A"

                        company_el = card.find("span", {"data-testid": "company-name"})
                        company = company_el.get_text(strip=True) if company_el else "N/A"

                        loc_el = card.find("div", {"data-testid": "text-location"})
                        location_text = loc_el.get_text(strip=True) if loc_el else "Remote"

                        link_el = card.find("a", {"class": lambda c: c and "jcs-JobTitle" in c})
                        job_url = f"https://www.indeed.com{link_el['href']}" if link_el and link_el.get("href") else ""

                        snippet_el = card.find("div", {"class": lambda c: c and "job-snippet" in c})
                        description = snippet_el.get_text(strip=True) if snippet_el else ""

                        jobs.append(ScrapedJob(
                            title=title,
                            company=company,
                            location=location_text,
                            job_type="full-time",
                            description=description,
                            application_url=job_url,
                            source="indeed",
                        ))
                    except Exception as e:
                        logger.debug(f"Error parsing Indeed job card: {e}")
                        continue

        except Exception as e:
            logger.error(f"Indeed scraper error: {e}")

        return jobs


class RemoteOKScraper:
    API_URL = "https://remoteok.com/api"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; AIJobApplier/1.0)",
        "Accept": "application/json",
    }

    DOMAIN_TAGS = {
        "software_engineering": ["dev", "software", "engineer", "backend", "fullstack"],
        "data_science": ["data", "analytics", "analyst", "bi", "sql"],
        "machine_learning": ["ai", "ml", "machine-learning", "deep-learning", "nlp"],
        "devops": ["devops", "sre", "infrastructure", "cloud", "kubernetes"],
        "frontend": ["frontend", "react", "vue", "angular", "javascript"],
        "backend": ["backend", "python", "node", "java", "golang"],
        "full_stack": ["fullstack", "full-stack", "web"],
        "mobile": ["ios", "android", "mobile", "react-native", "flutter"],
        "cybersecurity": ["security", "cybersecurity", "infosec"],
        "cloud_engineering": ["aws", "azure", "gcp", "cloud"],
        "ui_ux": ["design", "ui", "ux", "figma", "product-design"],
        "qa_testing": ["qa", "testing", "automation", "selenium"],
        "product_management": ["product", "product-manager", "pm"],
        "data_science": ["data-science", "data-analyst", "data-engineer"],
    }

    async def search(self, domain: str, skills: List[str] = None, max_results: int = 20) -> List[ScrapedJob]:
        jobs = []
        try:
            async with httpx.AsyncClient(headers=self.HEADERS, timeout=30) as client:
                response = await client.get(self.API_URL)
                if response.status_code != 200:
                    logger.warning(f"RemoteOK returned {response.status_code}")
                    return jobs

                data = response.json()
                tags = self.DOMAIN_TAGS.get(domain, ["software", "dev"])

                for item in data:
                    if not isinstance(item, dict) or "position" not in item:
                        continue

                    job_tags = [t.lower() for t in item.get("tags", [])]
                    if not any(tag in job_tags for tag in tags):
                        if skills:
                            skill_match = any(s.lower() in str(item).lower() for s in skills[:5])
                            if not skill_match:
                                continue
                        else:
                            continue

                    jobs.append(ScrapedJob(
                        title=item.get("position", "N/A"),
                        company=item.get("company", "N/A"),
                        location=item.get("location", "Remote"),
                        job_type="remote",
                        description=BeautifulSoup(item.get("description", ""), "lxml").get_text()[:1000],
                        application_url=item.get("url", f"https://remoteok.com/remote-jobs/{item.get('id', '')}"),
                        source="remoteok",
                        posted_at=datetime.fromtimestamp(item["epoch"], tz=timezone.utc) if item.get("epoch") else None,
                        requirements=item.get("tags", []),
                    ))

                    if len(jobs) >= max_results:
                        break

        except Exception as e:
            logger.error(f"RemoteOK scraper error: {e}")

        return jobs


class JobScraper:
    def __init__(self):
        self.remoteok = RemoteOKScraper()
        self.indeed = IndeedScraper()

    async def search_jobs(
        self,
        domain: str,
        skills: List[str] = None,
        location: str = "United States",
        experience_level: str = "fresher",
        max_per_source: int = 15,
    ) -> List[ScrapedJob]:
        query = self._build_query(domain, skills, experience_level)
        logger.info(f"Searching jobs: domain={domain}, query='{query}'")

        results = await asyncio.gather(
            self.remoteok.search(domain, skills, max_per_source),
            self.indeed.search(query, location, max_per_source),
            return_exceptions=True,
        )

        all_jobs = []
        for result in results:
            if isinstance(result, list):
                all_jobs.extend(result)
            else:
                logger.warning(f"Scraper error: {result}")

        seen_urls = set()
        unique_jobs = []
        for job in all_jobs:
            if job.application_url and job.application_url not in seen_urls:
                seen_urls.add(job.application_url)
                unique_jobs.append(job)

        logger.info(f"Found {len(unique_jobs)} unique jobs")
        return unique_jobs

    def _build_query(self, domain: str, skills: List[str], experience_level: str) -> str:
        domain_query_map = {
            "software_engineering": "Software Engineer",
            "data_science": "Data Scientist",
            "machine_learning": "Machine Learning Engineer",
            "devops": "DevOps Engineer",
            "frontend": "Frontend Developer",
            "backend": "Backend Developer",
            "full_stack": "Full Stack Developer",
            "mobile": "Mobile Developer",
            "cybersecurity": "Cybersecurity Engineer",
            "cloud_engineering": "Cloud Engineer",
            "ui_ux": "UI UX Designer",
            "qa_testing": "QA Engineer",
            "product_management": "Product Manager",
            "embedded": "Embedded Systems Engineer",
            "other": "Software Developer",
        }
        level_map = {
            "fresher": "entry level",
            "internship": "intern",
            "entry_level": "junior",
            "mid_level": "mid-level",
        }

        base = domain_query_map.get(domain, "Software Developer")
        level = level_map.get(experience_level, "entry level")
        skill_str = f" {skills[0]}" if skills else ""
        return f"{base}{skill_str} {level}"
