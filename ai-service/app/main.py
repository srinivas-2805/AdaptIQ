from fastapi import FastAPI, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app.config import MOCK_MODE
from app import llm_service, speech_service, vision_service, code_sandbox
from app.schemas import (
    ExtractSkillsRequest, ExtractSkillsResponse,
    GenerateQuestionsRequest, GenerateQuestionsResponse,
    EvaluateAnswerRequest, EvaluateAnswerResponse,
    FollowUpRequest, FollowUpResponse,
    SkillGapRequest, SkillGapResponse,
    PrepPlanRequest, PrepPlanResponse,
    VisionAnalyzeResponse,
    TTSRequest, SpeechAnalysisRequest,
    CodeExecutionRequest, CodeExecutionResponse
)

app = FastAPI(title="AdaptIQ AI Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mockMode": MOCK_MODE,
        "features": {
            "tts": True,
            "whisper": True,
            "mediapipeVision": True,
            "codeExecution": True
        }
    }


@app.post("/extract-skills", response_model=ExtractSkillsResponse)
def extract_skills(req: ExtractSkillsRequest):
    result = llm_service.extract_skills(req.resumeText, req.jdText)
    return ExtractSkillsResponse(**result)


@app.post("/generate-questions", response_model=GenerateQuestionsResponse)
def generate_questions(req: GenerateQuestionsRequest):
    questions = llm_service.generate_questions(
        skills=req.skills,
        requirements=req.requirements,
        count=req.count,
        projects=req.projects
    )
    return GenerateQuestionsResponse(questions=questions)


@app.post("/evaluate-answer", response_model=EvaluateAnswerResponse)
def evaluate_answer(req: EvaluateAnswerRequest):
    audio_dict = req.audioMetrics.model_dump() if req.audioMetrics else None
    vision_dict = req.visionMetrics.model_dump() if req.visionMetrics else None
    result = llm_service.evaluate_answer(
        question_text=req.questionText,
        topic=req.topic,
        difficulty=req.difficulty,
        answer_text=req.answerText,
        audio_metrics=audio_dict,
        vision_metrics=vision_dict
    )
    return EvaluateAnswerResponse(**result)


@app.post("/generate-followup", response_model=FollowUpResponse)
def generate_followup(req: FollowUpRequest):
    text = llm_service.generate_followup(req.previousQuestion, req.previousAnswer, req.topic)
    return FollowUpResponse(followUpQuestion=text)


@app.post("/skill-gap", response_model=SkillGapResponse)
def gap(req: SkillGapRequest):
    result = llm_service.skill_gap([q.model_dump() for q in req.qaHistory])
    return SkillGapResponse(**result)


@app.post("/prep-plan", response_model=PrepPlanResponse)
def plan(req: PrepPlanRequest):
    result = llm_service.prep_plan(req.weakAreas, req.days)
    return PrepPlanResponse(plan=result)


@app.post("/speech/transcribe")
async def transcribe(file: UploadFile = File(...)):
    content = await file.read()
    return speech_service.transcribe_audio(content, file.filename)


@app.post("/speech/tts")
def tts(req: TTSRequest):
    audio_bytes = speech_service.synthesize_speech(req.text, voice=req.voice or "alloy")
    if audio_bytes:
        return Response(content=audio_bytes, media_type="audio/mpeg")
    return {"status": "fallback_client_speech", "message": "Using browser Web Speech synthesis"}


@app.post("/speech/analyze")
def analyze_speech(req: SpeechAnalysisRequest):
    return speech_service.analyze_speech_features(req.text, req.durationSeconds)


@app.get("/vision/analyze", response_model=VisionAnalyzeResponse)
def vision_analyze(
    frames_with_face_centered: int = 0,
    total_frames: int = 0,
    frames_with_eye_contact: Optional[int] = None,
    frames_with_good_posture: Optional[int] = None
):
    result = vision_service.analyze_vision(
        frames_with_face_centered=frames_with_face_centered,
        total_frames=total_frames,
        frames_with_eye_contact=frames_with_eye_contact,
        frames_with_good_posture=frames_with_good_posture
    )
    return VisionAnalyzeResponse(**result)


# --- Coding Round Endpoints (Phase 6 Stretch Goal) ---
@app.get("/code/problems")
def get_coding_problems():
    return {"problems": code_sandbox.SAMPLE_CODING_PROBLEMS}


@app.post("/code/execute", response_model=CodeExecutionResponse)
def execute_code(req: CodeExecutionRequest):
    lang = req.language.lower()
    test_cases = req.testCases
    if not test_cases and req.problemId:
        for p in code_sandbox.SAMPLE_CODING_PROBLEMS:
            if p["id"] == req.problemId:
                test_cases = p["testCases"]
                break

    if lang == "python":
        res = code_sandbox.execute_python_code(req.code, test_cases)
    elif lang in ["javascript", "js", "node"]:
        res = code_sandbox.execute_javascript_code(req.code, test_cases)
    else:
        # Default Python
        res = code_sandbox.execute_python_code(req.code, test_cases)

    return CodeExecutionResponse(**res)
