import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
MOCK_MODE = len(OPENAI_API_KEY) == 0

LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "whisper-1")
