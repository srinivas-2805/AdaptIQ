from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ExtractSkillsRequest(BaseModel):
    resumeText: str
    jdText: Optional[str] = None


class ExtractSkillsResponse(BaseModel):
    skills: List[str]
    projects: List[str]
    requirements: List[str]


class GenerateQuestionsRequest(BaseModel):
    skills: List[str]
    requirements: List[str] = []
    projects: List[str] = []
    count: int = 5


class Question(BaseModel):
    id: str
    text: str
    topic: str
    difficulty: str  # easy | medium | hard


class GenerateQuestionsResponse(BaseModel):
    questions: List[Question]


class AudioMetricsDto(BaseModel):
    speakingSpeedWpm: Optional[int] = None
    fillerWordCount: Optional[int] = None
    pauseCount: Optional[int] = None
    clarityScore: Optional[int] = None
    durationSeconds: Optional[float] = None


class VisionMetricsDto(BaseModel):
    eyeContactPercentage: Optional[float] = None
    postureScore: Optional[int] = None
    postureNote: Optional[str] = None
    totalFramesAnalyzed: Optional[int] = None


class EvaluateAnswerRequest(BaseModel):
    questionText: str
    topic: str
    difficulty: str
    answerText: str
    audioMetrics: Optional[AudioMetricsDto] = None
    visionMetrics: Optional[VisionMetricsDto] = None


class DimensionScores(BaseModel):
    technicalKnowledge: int
    relevance: int
    communication: int
    clarity: int
    confidence: int


class EvaluateAnswerResponse(BaseModel):
    scores: DimensionScores
    overallScore: int
    reasons: Dict[str, str]
    nextDifficulty: str
    audioMetrics: Optional[Dict[str, Any]] = None
    visionMetrics: Optional[Dict[str, Any]] = None
    multimodalSummary: Optional[str] = None


class NextQuestionRequest(BaseModel):
    topic: str
    previousDifficulty: str
    previousScore: int
    askedTopics: List[str] = []
    skills: List[str] = []


class FollowUpRequest(BaseModel):
    previousQuestion: str
    previousAnswer: str
    topic: str


class FollowUpResponse(BaseModel):
    followUpQuestion: str


class QAItem(BaseModel):
    topic: str
    questionText: str
    answerText: str
    overallScore: int


class SkillGapRequest(BaseModel):
    qaHistory: List[QAItem]


class SkillGapResponse(BaseModel):
    weakAreas: List[str]
    strengths: List[str]
    averageScore: float
    recommendations: Optional[List[str]] = None


class PrepPlanRequest(BaseModel):
    weakAreas: List[str]
    days: int = 5


class PrepDay(BaseModel):
    day: int
    focus: str
    tasks: List[str]


class PrepPlanResponse(BaseModel):
    plan: List[PrepDay]


class VisionAnalyzeResponse(BaseModel):
    eyeContactPercentage: float
    postureScore: int
    postureNote: str
    confidenceIndicator: str


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "alloy"


class SpeechAnalysisRequest(BaseModel):
    text: str
    durationSeconds: Optional[float] = None


class CodeExecutionRequest(BaseModel):
    language: str  # python, javascript, java
    code: str
    problemId: Optional[str] = None
    testCases: Optional[List[Dict[str, Any]]] = None


class TestCaseResult(BaseModel):
    input: str
    expected: str
    actual: str
    passed: bool
    executionTimeMs: float


class CodeExecutionResponse(BaseModel):
    success: bool
    allPassed: bool
    output: str
    error: Optional[str] = None
    results: List[TestCaseResult]
    runtimeMs: float
    memoryMb: float
    complexityAnalysis: Optional[str] = None
