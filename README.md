# 🤖 AI Job Applier

> An intelligent AI agent that applies for jobs on behalf of students — cutting hours of manual effort down to zero.

## ✨ Features

- **Smart Onboarding** — Students set their domain, experience level, skills, and projects
- **AI Resume Review** — GPT-4 analyzes your resume, scores it, and suggests improvements
- **Auto-Apply Agents** — AI agents fill out job application forms automatically
- **Smart Interrupts** — AI pings you when it needs specific info, then resumes
- **Email Monitoring** — Tracks inbox for rejections, interview schedules, and follow-ups
- **Application Dashboard** — Full tracking of all applications and their statuses

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python + FastAPI |
| AI/Agents | OpenAI GPT-4o |
| Browser Automation | Playwright |
| Database | SQLite → PostgreSQL |
| Email | Gmail API |
| Frontend | Streamlit |

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/Bhuvanmysoresridhar/ai-job-applier.git
cd ai-job-applier
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your OpenAI API key and other settings
```

### 3. Run the Server

```bash
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs for the interactive API docs.

## 📁 Project Structure

```
ai-job-applier/
├── app/
│   ├── api/          # FastAPI routes (auth, profile, resume, jobs)
│   ├── agents/       # AI agents (resume reviewer, job matcher, auto-apply)
│   ├── models/       # SQLAlchemy database models
│   ├── scrapers/     # Job board scrapers (LinkedIn, Indeed)
│   ├── utils/        # Auth helpers, utilities
│   ├── config.py     # App configuration
│   ├── database.py   # DB connection
│   └── main.py       # FastAPI entry point
├── frontend/         # Streamlit dashboard
├── tests/            # Unit & integration tests
├── requirements.txt
└── .env.example
```

## 🔑 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new student |
| POST | `/api/auth/login` | Login |
| POST | `/api/profile/setup` | Set domain, skills, projects |
| GET | `/api/profile/me` | Get my profile |
| POST | `/api/resume/upload` | Upload resume (PDF) |
| POST | `/api/resume/{id}/analyze` | AI resume review |
| GET | `/api/resume/my-resumes` | List my resumes |

## 📜 License

MIT License — Built for students, by engineers who were students once.
