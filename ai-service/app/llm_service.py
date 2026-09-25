"""
LLM Service:
- Skill & project extraction from resume and target JD
- Personalized question generation tailored to candidate experience
- Context-aware follow-up question generation
- Multimodal answer evaluation (synthesizing text, speech acoustics, and visual signals)
- Explainable dimension-wise scoring (Technical, Relevance, Communication, Clarity, Confidence) with reasons
- Skill-gap analysis and day-wise personalized preparation plan generator
"""
import json
import re
import uuid
from typing import List, Dict, Any, Optional

from app.config import MOCK_MODE, LLM_MODEL, OPENAI_API_KEY
from app import speech_service, vision_service

_client = None
if not MOCK_MODE and OPENAI_API_KEY:
    try:
        from openai import OpenAI
        _client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        _client = None

SKILL_CATALOG = [
    # Languages
    "java", "python", "javascript", "typescript", "c++", "c", "c#", "go", "golang",
    "rust", "ruby", "php", "swift", "kotlin", "sql", "html", "css", "bash", "shell",
    # Frameworks & Libraries
    "react", "react.js", "next.js", "vue", "vue.js", "angular", "node.js", "express",
    "spring", "spring boot", "django", "flask", "fastapi", "hibernate", "redux",
    "tailwind css", "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy",
    # Databases & Caching
    "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "sqlite",
    # Cloud & DevOps
    "docker", "kubernetes", "k8s", "aws", "azure", "gcp", "terraform", "ci/cd",
    "jenkins", "github actions", "linux", "nginx", "prometheus", "grafana",
    # Architecture & Core CS
    "microservices", "rest api", "graphql", "websockets", "system design",
    "data structures", "algorithms", "object-oriented design", "concurrency",
    "multithreading", "distributed systems", "kafka", "rabbitmq", "security",
    "unit testing", "jwt", "webrtc"
]


def _find_skills(text: str) -> List[str]:
    """Finds matching skills with word boundaries to avoid false positives."""
    if not text:
        return []
    lower = text.lower()
    found = []
    for skill in SKILL_CATALOG:
        pattern = r"(?<![a-z0-9+#.])" + re.escape(skill) + r"(?![a-z0-9+#])"
        if re.search(pattern, lower):
            # Normalize display name
            display = skill.capitalize() if len(skill) <= 4 else skill.title()
            if skill in ["sql", "aws", "gcp", "k8s", "jwt", "ci/cd", "html", "css", "rest api"]:
                display = skill.upper()
            elif skill == "node.js":
                display = "Node.js"
            elif skill == "react.js" or skill == "react":
                display = "React"
            elif skill == "spring boot":
                display = "Spring Boot"
            if display not in found:
                found.append(display)
    return sorted(found)


def _extract_projects(text: str) -> List[str]:
    """Extracts project titles from resume text."""
    projects = []
    # Match bullet points or lines under project sections
    lines = text.split("\n")
    in_project_section = False
    for line in lines:
        stripped = line.strip()
        if re.search(r"(?i)^(projects?|key projects?|personal projects?)", stripped):
            in_project_section = True
            continue
        if in_project_section and re.search(r"(?i)^(education|skills|experience|certifications)", stripped):
            in_project_section = False
            continue

        if in_project_section and stripped:
            # Bullet point or header
            clean = re.sub(r"^[-*•\d\.\)]+\s*", "", stripped)
            if len(clean) > 5 and len(clean) < 80 and not clean.lower().startswith("built with") and not clean.lower().startswith("technologies"):
                if clean not in projects:
                    projects.append(clean)
                    if len(projects) >= 4:
                        break

    if not projects:
        # Fallback regex search
        matches = re.findall(r"(?im)^\s*[-*•]\s*(.+?(?:project|application|system|platform|pipeline|api).*)$", text)
        projects = [m.strip() for m in matches[:4]]

    return projects if projects else ["Full-Stack Web Application", "Cloud Microservices API"]


def _chat_json(system_prompt: str, user_prompt: str) -> dict:
    """Invokes OpenAI GPT-4o model with structured JSON reply."""
    if _client is None:
        raise RuntimeError("OpenAI client not configured")

    response = _client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


# ------------------------------------------------------------- 1. SKILLS ---
def extract_skills(resume_text: str, jd_text: Optional[str] = None) -> Dict[str, Any]:
    skills = _find_skills(resume_text)
    if not skills:
        skills = ["Software Engineering", "Problem Solving", "Web Development"]
    projects = _extract_projects(resume_text)
    requirements = _find_skills(jd_text) if jd_text else []

    if _client is not None:
        prompt = (
            "Extract candidate technical skills, notable projects, and target role requirements from this text.\n"
            f"RESUME:\n{resume_text[:3000]}\n\n"
            f"JOB DESCRIPTION:\n{jd_text[:1500] if jd_text else 'N/A'}\n\n"
            'Return ONLY JSON: {"skills": ["..."], "projects": ["..."], "requirements": ["..."]}'
        )
        try:
            parsed = _chat_json("You are an expert technical recruiter and resume parser.", prompt)
            return {
                "skills": parsed.get("skills", skills),
                "projects": parsed.get("projects", projects),
                "requirements": parsed.get("requirements", requirements)
            }
        except Exception:
            pass

    return {
        "skills": skills,
        "projects": projects,
        "requirements": requirements
    }


# ---------------------------------------------------------- 2. QUESTIONS ---
def generate_questions(
    skills: List[str],
    requirements: List[str] = None,
    count: int = 5,
    projects: List[str] = None
) -> List[Dict[str, Any]]:
    """Generates personalized technical and scenario-based interview questions."""
    requirements = requirements or []
    projects = projects or []
    topics = list(dict.fromkeys(requirements + skills)) or ["General Software Engineering"]

    if _client is not None:
        prompt = (
            f"Generate {count} distinct, personalized technical interview questions.\n"
            f"Candidate Skills: {skills}\n"
            f"Candidate Projects: {projects}\n"
            f"Target Role Requirements: {requirements}\n\n"
            "Include a mix of conceptual depth, real-world project challenges, and architectural trade-offs.\n"
            'Return ONLY JSON: {"questions": [{"id": "...", "text": "...", "topic": "...", "difficulty": "easy|medium|hard"}]}'
        )
        try:
            data = _chat_json("You are a Principal Software Engineer conducting a high-signal technical interview.", prompt)
            qs = data.get("questions", [])
            for q in qs:
                if "id" not in q:
                    q["id"] = str(uuid.uuid4())
            if len(qs) >= count:
                return qs[:count]
        except Exception:
            pass

    # High-quality personalized question templates
    templates = [
        ("medium", "In your experience with {topic}, walk me through how you designed a core feature or resolved a complex performance bottleneck."),
        ("easy", "What are the fundamental architectural principles of {topic}, and how do they impact code maintainability?"),
        ("hard", "Imagine your service built with {topic} experiences a 10x traffic surge causing elevated latency. How would you systematically diagnose and mitigate it?"),
        ("medium", "What major trade-offs or limitations have you encountered while using {topic}, and what alternatives did you consider?"),
        ("hard", "How do you handle data consistency, failure recovery, and fault tolerance when integrating {topic} in a distributed environment?"),
        ("medium", "How do you approach automated testing, error handling, and security hardening when building production services with {topic}?"),
        ("easy", "How would you explain the core value and lifecycle of {topic} to a junior developer joining your team?"),
    ]

    questions = []
    for i in range(count):
        topic = topics[i % len(topics)]
        difficulty, tmpl = templates[i % len(templates)]
        questions.append({
            "id": str(uuid.uuid4()),
            "text": tmpl.format(topic=topic),
            "topic": topic,
            "difficulty": difficulty,
        })
    return questions


# ------------------------------------------------- 3. MULTIMODAL EVAL ---
def _difficulty_shift(score: int, current: str) -> str:
    order = ["easy", "medium", "hard"]
    idx = order.index(current) if current in order else 1
    if score >= 80:
        return order[min(idx + 1, 2)]
    elif score < 55:
        return order[max(idx - 1, 0)]
    return order[idx]


def evaluate_answer(
    question_text: str,
    topic: str,
    difficulty: str,
    answer_text: str,
    audio_metrics: Optional[Dict[str, Any]] = None,
    vision_metrics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates answer multimodally across 5 explainable dimensions:
    - technicalKnowledge (accuracy, depth, terminology)
    - relevance (direct alignment to question)
    - communication (vocal pacing, filler words, clarity)
    - clarity (structural coherence, STAR format)
    - confidence (eye contact %, posture, vocal assertiveness)
    """
    # Acoustic analysis
    speech_data = speech_service.analyze_speech_features(
        answer_text,
        duration_seconds=audio_metrics.get("durationSeconds") if audio_metrics else None
    )
    if audio_metrics:
        # Merge client-reported metrics if provided
        for k in ["speakingSpeedWpm", "fillerWordCount", "pauseCount", "clarityScore"]:
            if audio_metrics.get(k) is not None:
                speech_data[k] = audio_metrics[k]

    # Visual analysis
    vis_data = vision_service.analyze_vision(
        frames_with_face_centered=vision_metrics.get("frames_with_face_centered", 0) if vision_metrics else 0,
        total_frames=vision_metrics.get("totalFramesAnalyzed", 0) if vision_metrics else 0,
        frames_with_eye_contact=int((vision_metrics.get("eyeContactPercentage", 75) / 100.0) * max(vision_metrics.get("totalFramesAnalyzed", 10), 10)) if vision_metrics and "eyeContactPercentage" in vision_metrics else None,
        frames_with_good_posture=int((vision_metrics.get("postureScore", 80) / 100.0) * max(vision_metrics.get("totalFramesAnalyzed", 10), 10)) if vision_metrics and "postureScore" in vision_metrics else None
    )
    if vision_metrics:
        if "eyeContactPercentage" in vision_metrics and vision_metrics["eyeContactPercentage"] is not None:
            vis_data["eyeContactPercentage"] = float(vision_metrics["eyeContactPercentage"])
        if "postureScore" in vision_metrics and vision_metrics["postureScore"] is not None:
            vis_data["postureScore"] = int(vision_metrics["postureScore"])
        if "postureNote" in vision_metrics and vision_metrics["postureNote"]:
            vis_data["postureNote"] = str(vision_metrics["postureNote"])

    # If real OpenAI client is available
    if _client is not None:
        prompt = (
            f"Question (Topic: {topic}, Difficulty: {difficulty}):\n{question_text}\n\n"
            f"Candidate Answer:\n{answer_text}\n\n"
            f"Speech Acoustic Metrics: WPM={speech_data['speakingSpeedWpm']}, FillerWords={speech_data['fillerWordCount']}, Clarity={speech_data['clarityScore']}\n"
            f"Vision Metrics: EyeContact={vis_data['eyeContactPercentage']}%, PostureScore={vis_data['postureScore']} ({vis_data['postureNote']})\n\n"
            "Score the response from 0 to 100 on each of the 5 dimensions:\n"
            "- technicalKnowledge: correctness, depth, specific technical terms, trade-off awareness\n"
            "- relevance: directly answering the core prompt without filler/tangents\n"
            "- communication: articulation, pacing (130-160 WPM optimal), minimal filler words\n"
            "- clarity: logical structure (problem, action, result), clear explanations\n"
            "- confidence: assertive phrasing, direct eye contact percentage, upright posture\n\n"
            "Also compute an overallScore (0-100) and choose nextDifficulty (easy|medium|hard).\n"
            "Provide a specific, actionable one-sentence reason for each dimension.\n"
            'Return ONLY JSON: {"scores": {"technicalKnowledge": n, "relevance": n, "communication": n, "clarity": n, "confidence": n}, '
            '"overallScore": n, "reasons": {"technicalKnowledge": "...", "relevance": "...", "communication": "...", "clarity": "...", "confidence": "..."}, '
            '"nextDifficulty": "...", "multimodalSummary": "..."}'
        )
        try:
            res = _chat_json("You are an expert multimodal technical interview examiner.", prompt)
            res["audioMetrics"] = speech_data
            res["visionMetrics"] = vis_data
            return res
        except Exception:
            pass

    # Heuristic multimodal scoring
    words = answer_text.strip().split()
    word_count = len(words)
    lower = answer_text.lower()

    # Technical score heuristic
    tech_keywords = [
        "because", "architecture", "tradeoff", "trade-off", "design", "scale", "latency",
        "concurrency", "index", "cache", "async", "algorithm", "database", "api", "service",
        "thread", "memory", "testing", "security", "distributed", "optimize", "query", "schema"
    ]
    matched_tech = sum(1 for k in tech_keywords if k in lower)
    has_topic = 1 if topic.lower() in lower else 0

    base_tech = min(word_count * 1.5, 45) + (matched_tech * 6) + (has_topic * 15)
    technical = int(min(max(base_tech, 30), 95))

    # Relevance heuristic
    relevance_base = 40 + (25 if has_topic else 0) + min(word_count * 0.8, 30)
    relevance = int(min(max(relevance_base, 35), 98))

    # Communication heuristic (incorporating speech pacing & filler words)
    comm_base = speech_data["clarityScore"]
    communication = int(min(max(comm_base, 25), 96))

    # Clarity heuristic
    structure_bonus = 15 if any(s in lower for s in ["first", "then", "finally", "for example", "in order to", "result"]) else 0
    clarity_base = 60 + structure_bonus - (speech_data["fillerWordCount"] * 4)
    clarity = int(min(max(clarity_base, 30), 95))

    # Confidence heuristic (incorporating visual eye contact & posture)
    eye_pct = vis_data.get("eyeContactPercentage", 75.0)
    posture_sc = vis_data.get("postureScore", 80)
    first_person_assertiveness = 10 if ("i designed" in lower or "i implemented" in lower or "i decided" in lower) else 0
    confidence_base = (eye_pct * 0.45) + (posture_sc * 0.35) + first_person_assertiveness + min(word_count * 0.2, 10)
    confidence = int(min(max(confidence_base, 35), 98))

    scores = {
        "technicalKnowledge": technical,
        "relevance": relevance,
        "communication": communication,
        "clarity": clarity,
        "confidence": confidence,
    }

    overall = int(round(sum(scores.values()) / 5.0))
    next_diff = _difficulty_shift(overall, difficulty)

    reasons = {
        "technicalKnowledge": (
            "Demonstrated solid technical depth, referencing concrete mechanisms and concepts."
            if technical >= 75 else
            "Answer touched on the topic but would benefit from deeper technical specifics, data structures, or trade-offs."
        ),
        "relevance": (
            "Directly addressed the interviewer's prompt with focused problem framing."
            if relevance >= 70 else
            "Only partially addressed the core question; keep focus tightly anchored to the scenario asked."
        ),
        "communication": (
            f"Clear verbal cadence ({speech_data['speakingSpeedWpm']} WPM) with minimal filler words ({speech_data['fillerWordCount']})."
            if communication >= 75 else
            f"Speaking pace was {speech_data['speakingSpeedWpm']} WPM with {speech_data['fillerWordCount']} filler words; practice smooth phrasing."
        ),
        "clarity": (
            "Well-structured answer with distinct logical progression."
            if clarity >= 70 else
            "Could be structured more sequentially (e.g. Problem → Technical Decision → Measurable Outcome)."
        ),
        "confidence": (
            f"Polished visual presence ({eye_pct}% eye contact, {vis_data['confidenceIndicator'].lower()} posture)."
            if confidence >= 70 else
            f"Visual connection was {eye_pct}% eye contact; sustain direct camera engagement to convey conviction."
        ),
    }

    multimodal_summary = (
        f"Multimodal assessment: Verbal pacing was {speech_data['speakingSpeedWpm']} WPM with {speech_data['fillerWordCount']} fillers. "
        f"Visual engagement registered {eye_pct}% direct eye contact ({vis_data['postureNote']}). Overall delivery was composed and articulate."
    )

    return {
        "scores": scores,
        "overallScore": overall,
        "reasons": reasons,
        "nextDifficulty": next_diff,
        "audioMetrics": speech_data,
        "visionMetrics": vis_data,
        "multimodalSummary": multimodal_summary,
    }


# --------------------------------------------------------- 4. FOLLOW-UPS ---
def generate_followup(previous_question: str, previous_answer: str, topic: str) -> str:
    """Generates context-aware follow-up question digging deeper into previous response."""
    if _client is not None:
        prompt = (
            f"Interviewer asked: {previous_question}\n"
            f"Candidate answered: {previous_answer}\n"
            f"Topic: {topic}\n\n"
            "Ask ONE context-aware technical follow-up question that challenges a specific claim, "
            "asks about an edge case, or explores scalability trade-offs based on their answer.\n"
            'Return ONLY JSON: {"followUpQuestion": "..."}'
        )
        try:
            data = _chat_json("You are an insightful technical interviewer digging deeper.", prompt)
            return data.get("followUpQuestion", f"Can you elaborate on how that approach scales in {topic}?")
        except Exception:
            pass

    # Dynamic contextual hooks based on answer content
    lower = previous_answer.lower()
    if "database" in lower or "sql" in lower or "cache" in lower:
        return f"Regarding your point about data management in {topic}, how would you prevent data inconsistency under concurrent writes?"
    elif "api" in lower or "microservice" in lower or "service" in lower:
        return f"When building that service with {topic}, how did you handle timeout propagation and circuit breaking when downstream dependencies fail?"
    elif "test" in lower or "error" in lower or "bug" in lower:
        return f"How do you design automated integration tests to catch edge cases before deploying {topic} changes to production?"
    elif len(previous_answer) > 100:
        return f"You mentioned key architectural decisions with {topic}. What was the biggest trade-off you had to accept, and how would you redesign it today?"
    else:
        return f"Could you dive deeper into a real-world scenario where you had to debug an unexpected issue with {topic}?"


# --------------------------------------------------------- 5. SKILL GAP ---
def skill_gap(qa_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyzes candidate performance history to identify strengths and skill gaps."""
    if not qa_history:
        return {
            "weakAreas": ["System Architecture", "Concurrency & Thread Safety"],
            "strengths": ["Web Fundamentals", "Communication"],
            "averageScore": 70.0,
            "recommendations": ["Review distributed systems concepts and database query optimization."]
        }

    by_topic = {}
    for item in qa_history:
        topic = item.get("topic", "General")
        by_topic.setdefault(topic, []).append(item.get("overallScore", 70))

    weak, strong = [], []
    for topic, scores in by_topic.items():
        avg = sum(scores) / len(scores)
        if avg < 65:
            weak.append(topic)
        else:
            strong.append(topic)

    if not weak and strong:
        # If all scores were good, suggest advanced optimization of lowest topic
        sorted_topics = sorted(by_topic.keys(), key=lambda t: sum(by_topic[t]) / len(by_topic[t]))
        weak.append(f"Advanced {sorted_topics[0]} Optimization")

    avg_all = sum(i.get("overallScore", 0) for i in qa_history) / max(len(qa_history), 1)

    recommendations = [
        f"Focus deep study on: {', '.join(weak[:3])}.",
        "Practice speaking with concise STAR structuring (Situation, Task, Action, Result).",
        "Maintain direct camera eye contact to reinforce confidence when explaining trade-offs."
    ]

    return {
        "weakAreas": weak,
        "strengths": strong,
        "averageScore": round(avg_all, 1),
        "recommendations": recommendations
    }


# --------------------------------------------------------- 6. PREP PLAN ---
def prep_plan(weak_areas: List[str], days: int = 5) -> List[Dict[str, Any]]:
    """Generates a day-wise personalized preparation plan targeting weak skill areas."""
    if not weak_areas:
        weak_areas = ["System Design & Architecture", "Database Query Optimization", "Concurrency & Thread Safety"]

    plan = []
    for d in range(1, days + 1):
        topic = weak_areas[(d - 1) % len(weak_areas)]
        plan.append({
            "day": d,
            "focus": f"Mastering {topic}",
            "tasks": [
                f"Core Study: Review {topic} architectural patterns, official documentation, and best practices (45 min).",
                f"Hands-On Implementation: Build a self-contained code example demonstrating {topic} concurrency or error handling (40 min).",
                f"Mock Verbal Drill: Record a 3-minute explanation of {topic} trade-offs, aiming for 130-150 WPM and zero filler words (15 min).",
                f"Review & Self-Evaluation: Check solution against production design guidelines and refine your explanation."
            ]
        })
    return plan
