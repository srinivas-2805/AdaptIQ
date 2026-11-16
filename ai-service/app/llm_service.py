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


# --------------------------------------------------------- 4. ADAPTIVE QUESTIONS & FOLLOW-UPS ---
def generate_adaptive_question(
    skills: List[str],
    projects: Optional[List[str]] = None,
    requirements: Optional[List[str]] = None,
    previous_question: Optional[str] = None,
    previous_answer: Optional[str] = None,
    previous_topic: Optional[str] = None,
    previous_score: Optional[int] = None,
    current_difficulty: str = "medium",
    asked_topics: Optional[List[str]] = None,
    round_number: int = 1
) -> Dict[str, Any]:
    """
    Dynamically generates the next interview question tailored to:
    - Candidate resume skills and projects
    - Target JD requirements (if provided)
    - Depth, correctness, and weaknesses of candidate's previous response
    - Cognitive difficulty shift (easy -> medium -> hard)
    - Intelligent drill-down vs. cross-domain pivot
    """
    skills = skills or ["Software Engineering"]
    projects = projects or []
    requirements = requirements or []
    asked_topics = asked_topics or []

    # Calculate adaptive target difficulty
    if previous_score is not None:
        target_diff = _difficulty_shift(previous_score, current_difficulty)
    else:
        target_diff = current_difficulty

    # Determine all candidate topics, prioritizing JD requirements followed by resume skills
    pool_topics = []
    for r in requirements:
        if r and r not in pool_topics:
            pool_topics.append(r)
    for s in skills:
        if s and s not in pool_topics:
            pool_topics.append(s)
    if not pool_topics:
        pool_topics = ["System Architecture", "API Design", "Data Structures"]

    # Decision: Follow-up drill-down vs. Pivot
    is_follow_up = False
    target_topic = pool_topics[0]

    if previous_question and previous_answer and previous_topic:
        times_asked = asked_topics.count(previous_topic)
        # If candidate mentioned concrete technical mechanisms or showed a gap (<65) on previous topic
        # and has only answered 1 question on it, probe deeper with a targeted follow-up!
        if times_asked <= 1 and (previous_score is not None and (previous_score < 65 or len(previous_answer) > 120)):
            is_follow_up = True
            target_topic = previous_topic
        else:
            # Pivot to next unasked topic from requirements or skills
            unasked = [t for t in pool_topics if t not in asked_topics]
            if unasked:
                target_topic = unasked[0]
            else:
                # If all covered, cycle to the topic where candidate had the lowest score
                target_topic = pool_topics[(round_number - 1) % len(pool_topics)]
    else:
        # First question of the interview
        target_topic = pool_topics[0]

    # --- Live GPT-4o Generation ---
    if _client is not None:
        mode_desc = (
            f"DEEP-DIVE FOLLOW UP: The candidate previously answered: '{previous_answer}'. "
            "Challenge a specific claim, explore failure modes/edge cases, or demand trade-off analysis."
            if is_follow_up else
            f"PIVOT TO TOPIC: Ask a fresh, high-signal scenario question about {target_topic}."
        )
        prompt = (
            f"You are conducting a high-signal technical mock interview.\n"
            f"Candidate Skills: {skills}\n"
            f"Candidate Projects: {projects}\n"
            f"Target Role Requirements: {requirements}\n\n"
            f"INTERVIEW CONTEXT:\n"
            f"- Round Number: {round_number}\n"
            f"- Topics Already Asked: {asked_topics}\n"
            f"- Previous Question: {previous_question or 'N/A'}\n"
            f"- Candidate Previous Answer: {previous_answer or 'N/A'}\n"
            f"- Previous Score: {previous_score if previous_score is not None else 'N/A'}/100\n"
            f"- Next Target Topic: {target_topic}\n"
            f"- Target Difficulty: {target_diff}\n"
            f"- Mode: {mode_desc}\n\n"
            "Generate ONE crisp, professional technical question tailored specifically to their experience.\n"
            'Return ONLY JSON: {"text": "...", "topic": "' + target_topic + '", "difficulty": "' + target_diff + '", "isFollowUp": ' + str(is_follow_up).lower() + ', "rationale": "..."}'
        )
        try:
            parsed = _chat_json("You are a Principal Software Engineer and Technical Interviewer.", prompt)
            return {
                "id": str(uuid.uuid4()),
                "text": parsed.get("text", f"Can you walk me through your technical experience with {target_topic}?"),
                "topic": parsed.get("topic", target_topic),
                "difficulty": parsed.get("difficulty", target_diff),
                "isFollowUp": parsed.get("isFollowUp", is_follow_up),
                "rationale": parsed.get("rationale", f"Testing {target_diff} competency in {target_topic}")
            }
        except Exception:
            pass

    # --- High-Fidelity Heuristic Generation (Mock Mode) ---
    q_text = ""
    rationale = ""
    if is_follow_up:
        lower_ans = (previous_answer or "").lower()
        if any(k in lower_ans for k in ["database", "sql", "cache", "redis", "query", "index", "table"]):
            q_text = f"In your response regarding {target_topic}, you mentioned data access. Under high concurrent write spikes, how would you prevent race conditions, cache inconsistency, and database locking?"
            rationale = f"Probing data layer concurrency depth in {target_topic}"
        elif any(k in lower_ans for k in ["api", "microservice", "service", "rest", "endpoint", "grpc"]):
            q_text = f"Expanding on the {target_topic} architecture you described: how do you implement timeout budgets, circuit breaking, and dead-letter queues when downstream services experience outage?"
            rationale = f"Evaluating fault tolerance and distributed resilience in {target_topic}"
        elif any(k in lower_ans for k in ["test", "bug", "latency", "memory", "leak", "bottleneck"]):
            q_text = f"You touched on reliability with {target_topic}. How would you systematically diagnose and resolve a 99th-percentile tail latency spike in production without restarting the service?"
            rationale = f"Testing operational diagnostics and performance profiling in {target_topic}"
        else:
            q_text = f"You discussed your approach to {target_topic}. What is the most critical trade-off you had to make in that design, and under what conditions would you re-architect it?"
            rationale = f"Challenging architectural trade-offs in {target_topic}"
    else:
        # Pivot or Opening question based on target_diff
        if target_diff == "hard":
            hard_templates = [
                "Imagine a mission-critical service built with {topic} experiences a 10x traffic spike causing CPU throttling and thread pool exhaustion. Walk me through your step-by-step triage and mitigation strategy.",
                "How would you architect a distributed, fault-tolerant system using {topic} that ensures zero-downtime rolling deployments and seamless database schema migrations?",
                "What are the hardest edge cases and data consistency challenges you have resolved when designing systems with {topic} at scale?"
            ]
            q_text = hard_templates[(round_number - 1) % len(hard_templates)].format(topic=target_topic)
            rationale = f"Assessing advanced system design and disaster mitigation in {target_topic}"
        elif target_diff == "easy":
            easy_templates = [
                "What are the foundational architectural principles of {topic}, and how do they impact code maintainability and testability?",
                "How would you explain the core lifecycle, data flow, and separation of concerns in {topic} to a junior engineer?",
                "What are common pitfalls or anti-patterns developers encounter when starting with {topic}, and how do you avoid them?"
            ]
            q_text = easy_templates[(round_number - 1) % len(easy_templates)].format(topic=target_topic)
            rationale = f"Evaluating core conceptual foundations in {target_topic}"
        else:
            med_templates = [
                "In your experience with {topic}, walk me through how you designed a core feature or resolved a complex performance bottleneck in production.",
                "How do you approach automated testing, error boundaries, and security hardening when building production services with {topic}?",
                "What major architectural trade-offs or constraints have you encountered while using {topic}, and what alternatives did you consider?"
            ]
            q_text = med_templates[(round_number - 1) % len(med_templates)].format(topic=target_topic)
            rationale = f"Testing real-world implementation depth and trade-offs in {target_topic}"

    return {
        "id": str(uuid.uuid4()),
        "text": q_text,
        "topic": target_topic,
        "difficulty": target_diff,
        "isFollowUp": is_follow_up,
        "rationale": rationale
    }


def generate_followup(previous_question: str, previous_answer: str, topic: str) -> str:
    """Generates context-aware follow-up question digging deeper into previous response."""
    res = generate_adaptive_question(
        skills=[topic],
        previous_question=previous_question,
        previous_answer=previous_answer,
        previous_topic=topic,
        previous_score=60,
        asked_topics=[topic]
    )
    return res["text"]


# --------------------------------------------------------- 5. SKILL GAP ---
def skill_gap(
    qa_history: List[Dict[str, Any]],
    resume_skills: Optional[List[str]] = None,
    resume_projects: Optional[List[str]] = None,
    jd_requirements: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyzes candidate performance history AND compares resume skills against
    target Job Description (JD) requirements to identify:
    - Missing JD requirements (skills required by employer but absent from resume)
    - Interview performance gaps (topics scored below threshold in practice)
    - Demonstrated strengths (high-scoring topics and verified project competencies)
    """
    resume_skills = resume_skills or []
    resume_projects = resume_projects or []
    jd_requirements = jd_requirements or []

    # 1. Compare Resume Skills against Target JD Requirements
    norm_resume = {s.lower().strip() for s in resume_skills}
    missing_jd = []
    for req in jd_requirements:
        req_clean = req.strip()
        req_lower = req_clean.lower()
        # Check if requirement or any sub-word exists in resume skills
        if req_lower not in norm_resume and not any(r in req_lower or req_lower in r for r in norm_resume):
            if req_clean not in missing_jd:
                missing_jd.append(req_clean)

    # 2. Analyze Interview Performance by Topic
    by_topic = {}
    for item in qa_history:
        topic = item.get("topic", "General")
        by_topic.setdefault(topic, []).append(item.get("overallScore", 70))

    interview_weak = []
    interview_strengths = []
    for topic, scores in by_topic.items():
        avg = sum(scores) / len(scores)
        if avg < 65:
            interview_weak.append(topic)
        elif avg >= 70:
            interview_strengths.append(topic)

    # If candidate had good scores, suggest advanced optimization for lowest topic
    if not interview_weak and by_topic:
        sorted_topics = sorted(by_topic.keys(), key=lambda t: sum(by_topic[t]) / len(by_topic[t]))
        interview_weak.append(f"Advanced {sorted_topics[0]} Optimization")

    # Combine weak areas: Interview gaps + Missing JD requirements
    combined_weak = list(interview_weak)
    for m in missing_jd:
        label = f"{m} (Missing from Target JD)"
        if label not in combined_weak:
            combined_weak.append(label)

    # Strengths: topics candidate scored high on
    combined_strengths = list(interview_strengths)
    if not combined_strengths and resume_skills:
        combined_strengths = resume_skills[:3]

    avg_all = sum(i.get("overallScore", 70) for i in qa_history) / max(len(qa_history), 1)

    # --- Live GPT-4o Skill Gap Analysis ---
    if _client is not None:
        prompt = (
            "You are a Senior Technical Recruiter and Hiring Manager conducting a Skill-Gap Analysis.\n\n"
            f"Candidate Resume Skills: {resume_skills}\n"
            f"Candidate Projects: {resume_projects}\n"
            f"Target Role Requirements: {jd_requirements}\n"
            f"Missing JD Skills: {missing_jd}\n"
            f"Interview Rounds Q&A Performance: {qa_history}\n\n"
            "Provide an actionable, explainable skill-gap evaluation:\n"
            "- weakAreas: concrete list of technical gaps observed in interview or missing from JD\n"
            "- strengths: demonstrated competencies and verified strong topics\n"
            "- missingJdSkills: target role requirements not evidenced in resume\n"
            "- recommendations: 3 specific, high-impact recommendations to bridge the gap\n"
            'Return ONLY JSON: {"weakAreas": ["..."], "strengths": ["..."], "missingJdSkills": ["..."], "recommendations": ["..."]}'
        )
        try:
            parsed = _chat_json("You are an expert technical hiring manager.", prompt)
            return {
                "weakAreas": parsed.get("weakAreas", combined_weak),
                "strengths": parsed.get("strengths", combined_strengths),
                "missingJdSkills": parsed.get("missingJdSkills", missing_jd),
                "averageScore": round(avg_all, 1),
                "recommendations": parsed.get("recommendations", [
                    f"Bridge target JD gap: Build a dedicated project incorporating {', '.join(missing_jd[:2]) if missing_jd else 'advanced architecture'}.",
                    f"Strengthen interview performance in: {', '.join(interview_weak[:2]) if interview_weak else 'system scale'}.",
                    "Practice structured STAR explanations focusing on measurable latency, scale, and uptime outcomes."
                ])
            }
        except Exception:
            pass

    # Heuristic recommendations
    recs = []
    if missing_jd:
        recs.append(f"Target Role Gap: The target JD emphasizes {', '.join(missing_jd[:3])}. Add hands-on project examples or certifications demonstrating proficiency in these areas.")
    if interview_weak:
        recs.append(f"Technical Interview Focus: Deepen conceptual depth and trade-off explanations in {', '.join(interview_weak[:2])}.")
    recs.append("Delivery & Structure: Structure verbal responses sequentially (Problem Context → Technical Decision → Measurable Result).")

    return {
        "weakAreas": combined_weak,
        "strengths": combined_strengths,
        "missingJdSkills": missing_jd,
        "averageScore": round(avg_all, 1),
        "recommendations": recs
    }


# --------------------------------------------------------- 6. PREP PLAN ---
def prep_plan(weak_areas: List[str], days: int = 5) -> List[Dict[str, Any]]:
    """Generates a day-wise personalized preparation plan targeting weak skill areas and missing JD skills."""
    if not weak_areas:
        weak_areas = ["System Design & Architecture", "Database Concurrency & Caching", "API Resilience & Error Handling"]

    # Clean display names (remove annotations like "(Missing from Target JD)")
    clean_topics = []
    for w in weak_areas:
        clean = re.sub(r"\s*\(.*?\)\s*", "", w).strip()
        if clean and clean not in clean_topics:
            clean_topics.append(clean)
    if not clean_topics:
        clean_topics = weak_areas

    plan = []
    for d in range(1, days + 1):
        topic = clean_topics[(d - 1) % len(clean_topics)]
        plan.append({
            "day": d,
            "focus": f"Mastering {topic}",
            "tasks": [
                f"Core Deep-Dive: Study {topic} production architecture, design patterns, and official documentation (45 min).",
                f"Hands-On Implementation: Build a working code example demonstrating {topic} concurrency, error boundaries, or caching (45 min).",
                f"Verbal Technical Drill: Practice a 3-minute explanation of {topic} architectural trade-offs, aiming for 130-150 WPM and direct eye contact (15 min).",
                f"Production Self-Check: Verify your solution against high-availability and security best practices."
            ]
        })
    return plan
