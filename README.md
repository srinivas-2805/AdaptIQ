# AdaptIQ

**An Explainable, Multimodal AI Interview Coach with Personalized Skill-Gap Analysis**

AdaptIQ personalizes technical and behavioral interview preparation based on a candidate's actual resume and target job description. It runs an adaptive voice/video mock interview, analyzes responses using a multimodal pipeline (speech acoustics, computer vision gaze/posture, and technical depth), delivers explainable dimension-wise evaluations, performs skill-gap analysis, generates a personalized day-wise preparation plan, tracks long-term performance trends, and includes an auto-executed technical coding sandbox round.

---

## Architecture

```
Candidate Browser (React.js)
  │
  ├─ REST (HTTPS) ──────────────────────────┐
  ├─ WebSockets (/ws/interview) ────────────┤
  └─ WebRTC / MediaStream (Video & Mic) ────┤
                                            ▼
                          Backend: Java (Spring Boot 3)
                          ├─ Authentication Service (JWT)
                          ├─ Resume & JD Processing (PDFBox)
                          ├─ Interview Management Service
                          ├─ Evaluation Orchestration Service
                          ├─ Skill-Gap & Preparation Plan Service
                          ├─ WebSocket Signaling & Telemetry Handler
                          │         │
                          │         ├─► MySQL 8 Database
                          │         │     (Users, Resumes, JDs, Sessions,
                          │         │      Questions, Answers, Evaluations,
                          │         │      Skill Gaps, Plans, History)
                          ▼
            AI/ML Microservice: Python (FastAPI)
            ├─ LLM Service (GPT-4o / Heuristic Fallback Engine):
            │    Skill/Project extraction, tailored question generation,
            │    adaptive follow-ups, explainable 5-dimension scoring
            ├─ Speech Service (Whisper + TTS + Acoustic Feature Analyzer):
            │    Speech-to-text, Text-to-speech audio, WPM, filler words, pauses
            ├─ Vision Service (MediaPipe / Computer Vision Telemetry):
            │    Gaze & eye contact %, posture alignment & confidence score
            └─ Code Sandbox Service:
                 Subprocess code execution for Python & JavaScript with test cases
```

---

## Features & Implementation Status

| Feature / Phase | Implementation Detail | Status |
|---|---|---|
| **Phase 0: Scaffolding & Monorepo** | React + Spring Boot 3 + FastAPI + MySQL 8 monorepo with Flyway/SQL migrations and JWT authentication. | **Complete** |
| **Phase 1: Resume/JD Question Generation** | PDF/TXT resume parsing (Apache PDFBox), skill/project extraction, JD requirement alignment, dynamic question generation. Quick-start sample profiles. | **Complete** |
| **Phase 2: Adaptive Interview Engine** | WebRTC camera feed, Web Audio API frequency visualizer, AI interviewer TTS voice, live Speech-to-Text transcription, dynamic difficulty adaptation (Easy/Med/Hard), context-aware follow-ups. | **Complete** |
| **Phase 3: Multimodal Evaluation** | Speech acoustic analysis (WPM, filler words, pauses, clarity score) + MediaPipe computer vision (eye contact %, posture tracking, HUD overlay) combined into unified payload. | **Complete** |
| **Phase 4: Explainable Scoring & Prep Plan** | 5-dimension scoring (Technical, Relevance, Communication, Clarity, Confidence) with concrete reasons per dimension. Skill-gap extraction and day-wise personalized preparation plan. | **Complete** |
| **Phase 5: Dashboard & Progress Tracking** | Historical attempt tracking in `performance_history` and `evaluations`. Dimension progression analytics, score progression chart, strengths and recurring gap indicators. | **Complete** |
| **Phase 6: Technical Coding Round (Stretch)** | Auto-executed isolated sandbox execution for Python and JavaScript. Test case runner, runtime measurement (ms), memory estimation, and algorithmic Big-O complexity feedback. | **Complete** |

---

## Database Schema (MySQL)

All tables are created and managed via migrations:

1. `users` — Candidate authentication and credentials
2. `resumes` — Raw resume text, extracted skills JSON, extracted projects JSON
3. `job_descriptions` — Target job description text and extracted requirements JSON
4. `interview_sessions` — Session lifecycle, status (`IN_PROGRESS` / `COMPLETED`), average score
5. `questions` — Personalized questions, topic, difficulty (`easy`, `medium`, `hard`), order index
6. `answers` — Candidate response text, dimensional scores, explainable reasons JSON
7. `evaluations` — Multimodal record: speech speed (WPM), filler word count, pauses, clarity score, eye contact %, posture score, posture note, multimodal summary
8. `skill_gap_results` / `skill_gaps` — Identified weak areas, strengths, average score
9. `preparation_plans` — Personalized day-wise preparation plan JSON
10. `performance_history` — User progress over time, dimensional averages (technical, communication, confidence), improvement rate

---

## Quick Start (Docker — Recommended)

### 1. Prerequisites
- Docker & Docker Compose installed.

### 2. Configure Environment (Optional)
```bash
cd adaptiq
cp .env.example .env
```
*(Optional)* Add your `OPENAI_API_KEY` in `.env` to enable live GPT-4o, Whisper STT, and OpenAI TTS. If left blank, AdaptIQ automatically operates in high-fidelity **MOCK MODE**, running heuristic extraction, adaptive difficulty shifts, acoustic speech analysis, computer vision tracking, and code sandbox execution with zero cost or external API keys.

### 3. Launch Services
```bash
docker compose up --build
```

### 4. Access the Application
- **Frontend Web UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8080](http://localhost:8080)
- **AI Microservice Swagger Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **MySQL Database:** `localhost:3307` (`root` / `root`, DB: `adaptiq`)

---

## Running Manually (Without Docker)

### 1. MySQL 8 Database
Ensure MySQL is running on port 3306 (or 3307):
```sql
CREATE DATABASE IF NOT EXISTS adaptiq;
```

### 2. AI Microservice (Python FastAPI)
```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Set optional API key in .env or environment
export OPENAI_API_KEY=""
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Core Backend (Java Spring Boot)
```bash
cd backend
export DB_HOST=localhost
export DB_PORT=3307  # or 3306
export DB_NAME=adaptiq
export DB_USER=root
export DB_PASSWORD=root
export AI_SERVICE_URL=http://localhost:8001
mvn spring-boot:run
```

### 4. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Using AdaptIQ

1. **Sign Up / Log In:** Create an account or sign in.
2. **New Interview:**
   - Paste resume text or upload a `.pdf` or `.txt` resume file.
   - Use the **Quick Test Drive** buttons to load sample profiles (e.g. *Full Stack Engineer*, *AI/ML Engineer*, *Cloud DevOps*).
   - Optionally paste a target Job Description.
   - Choose the number of interview questions (3, 5, or 8) and click **Generate Personalized Questions & Begin**.
3. **Adaptive Multimodal Interview:**
   - Allow camera and microphone permissions to enable WebRTC video preview, real-time eye contact tracking, and posture scoring.
   - Listen to the question read out loud by the AI Interviewer (TTS).
   - Click **🎙️ Speak Answer** to speak your response out loud (with real-time live speech recognition) or type/edit in the answer box.
   - Click **Submit Answer & Proceed**: The system scores your answer multimodally, displays an explainable breakdown (Technical, Relevance, Communication, Clarity, Confidence) with specific reasons, and adapts the difficulty of the next question.
4. **Evaluation Report & Preparation Plan:**
   - Upon completion, view your overall score, rating, and identified **Skill Gaps** vs. **Strengths**.
   - Browse your interactive **Day-Wise Preparation Plan** (Day 1 through Day 5) with focused technical tasks, hands-on exercises, and verbal drills.
   - Inspect question-by-question historical review with acoustic telemetry and visual posture analysis.
5. **Progress Dashboard:**
   - Track your mock interview count, average score, personal best, and dimensional averages.
   - Inspect score progression bar charts and session history.
6. **Technical Coding Round:**
   - Navigate to the **Coding Round** tab.
   - Pick an algorithmic problem (e.g., *Two Sum*, *Valid Parentheses*), choose your language (Python or JavaScript), and run your solution against test cases in the sandbox environment.

---

## Environment Variables Reference

| Variable | Service | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | `ai-service` | *(empty = Mock Mode)* | OpenAI API key for GPT-4o, Whisper STT, and TTS |
| `LLM_MODEL` | `ai-service` | `gpt-4o` | Model used for LLM inference |
| `WHISPER_MODEL` | `ai-service` | `whisper-1` | Model used for Whisper audio transcription |
| `DB_HOST` | `backend` | `localhost` / `mysql` | MySQL host address |
| `DB_PORT` | `backend` | `3306` / `3307` | MySQL port |
| `DB_NAME` | `backend` | `adaptiq` | MySQL database name |
| `DB_USER` | `backend` | `root` | MySQL username |
| `DB_PASSWORD` | `backend` | `root` | MySQL password |
| `JWT_SECRET` | `backend` | `adaptiq-dev-secret...` | Secret key used for signing JWT tokens |
| `AI_SERVICE_URL` | `backend` | `http://localhost:8001` | URL of the FastAPI microservice |
| `CORS_ORIGINS` | `backend` | `http://localhost:5173` | Allowed CORS origins |
| `VITE_API_BASE_URL` | `frontend` | `http://localhost:8080/api` | Spring Boot backend REST endpoint |
