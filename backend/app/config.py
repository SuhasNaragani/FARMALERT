import os
from dotenv import load_dotenv

# Load env variables from root folder
load_dotenv()

class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_RAG_API_KEY: str = os.getenv("GEMINI_RAG_API_KEY", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_HOST: str = os.getenv("PINECONE_HOST", "")

settings = Settings()
