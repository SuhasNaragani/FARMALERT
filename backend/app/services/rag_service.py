import os
from collections import OrderedDict
from google import genai
from google.genai.types import EmbedContentConfig
from pinecone import Pinecone
from app.config import settings

print("RAG SERVICE LOADED - PINECONE_API_KEY present:", bool(settings.PINECONE_API_KEY), flush=True)
print("RAG SERVICE LOADED - GEMINI_RAG_API_KEY present:", bool(settings.GEMINI_RAG_API_KEY), flush=True)
print("RAG SERVICE LOADED - PINECONE_HOST present:", bool(settings.PINECONE_HOST), flush=True)

# --- Cache ---
_cache: OrderedDict = OrderedDict()
MAX_CACHE_SIZE = 100

# --- Clients ---
_genai_client = genai.Client(api_key=settings.GEMINI_RAG_API_KEY)
_pc = Pinecone(api_key=settings.PINECONE_API_KEY)
_index = _pc.Index(host=settings.PINECONE_HOST)

def _get_embedding(text: str) -> list[float]:
    response = _genai_client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
        ),
    )
    return response.embeddings[0].values

def _retrieve_chunks(query_vector: list[float], top_k: int = 5) -> list[str]:
    results = _index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
    )
    return [match.metadata["text"] for match in results.matches]

def _generate_answer(question: str, chunks: list[str]) -> str:
    try:
        context = "\n\n---\n\n".join(chunks)
        prompt = f"""You are a knowledgeable agricultural assistant helping smallholder farmers in Telangana, India.
Answer the farmer's question using ONLY the context provided below.
If the answer is not found in the context, say: "I don't have specific information about that in my knowledge base. Please consult your local agricultural extension officer."
Be practical, specific, and clear. Keep the answer concise (under 200 words).

CONTEXT:
{context}

FARMER'S QUESTION:
{question}

ANSWER:"""
        response = _genai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        import traceback
        print(f"GENERATION ERROR: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise

def answer_question(question: str, crop: str = "", stage: str = "", location: str = "") -> dict:
    try:
        # Build cache key from full context
        cache_key = f"{question}|{crop}|{stage}|{location}"

        # Check cache first
        if cache_key in _cache:
            _cache.move_to_end(cache_key)
            return {"answer": _cache[cache_key], "cached": True}

        # Build enriched query for better retrieval
        enriched_query = question
        context_parts = []
        if crop:
            context_parts.append(f"crop: {crop}")
        if stage:
            context_parts.append(f"stage: {stage}")
        if location:
            context_parts.append(f"location: {location}")
        if context_parts:
            enriched_query = f"{question} — {', '.join(context_parts)}"

        # Retrieve and generate
        query_vector = _get_embedding(enriched_query)
        chunks = _retrieve_chunks(query_vector)
        answer = _generate_answer(question, chunks)

        # Store in cache, evict oldest if full
        if len(_cache) >= MAX_CACHE_SIZE:
            _cache.popitem(last=False)
        _cache[cache_key] = answer

        return {"answer": answer, "cached": False}
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"ANSWER_QUESTION ERROR: {e}", flush=True)
        print(error_msg, flush=True)
        raise
