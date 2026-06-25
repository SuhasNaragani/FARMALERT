import os
import time
import fitz
from google import genai
from google.genai.errors import ClientError
from pinecone import Pinecone

SOURCE_DIR = "data/source_docs"

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"], http_options={"api_version": "v1"})

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index(host="https://farmalert-kb-yxmnu3h.svc.aped-4627-b74a.pinecone.io")

def extract_text_from_pdf(filepath):
    text = ""
    doc = fitz.open(filepath)
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text

def chunk_text(text, chunk_size_words=375, overlap_words=75):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size_words
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += (chunk_size_words - overlap_words)
    return chunks

def get_embedding(text):
    for attempt in range(5):
        try:
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
                config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": 768},
            )
            return result.embeddings[0].values
        except ClientError as e:
            if e.status_code == 429:
                wait = 2 ** attempt * 5
                print(f"    Rate limited — waiting {wait}s before retry {attempt + 1}/5...")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError("Embedding failed after 5 retries")

def upsert_chunks(index, filename, chunks):
    doc_slug = filename.replace(".pdf", "").replace(" ", "_").replace("(", "").replace(")", "")
    vectors = []
    for i, chunk in enumerate(chunks):
        embedding = get_embedding(chunk)
        time.sleep(0.5)
        vectors.append({
            "id": f"{doc_slug}_chunk_{i}",
            "values": embedding,
            "metadata": {
                "text": chunk,
                "source": filename,
                "chunk_index": i,
            }
        })
    index.upsert(vectors=vectors)
    return len(vectors)

if __name__ == "__main__":
    for filename in os.listdir(SOURCE_DIR):
        if filename.endswith(".pdf"):
            path = os.path.join(SOURCE_DIR, filename)
            text = extract_text_from_pdf(path)
            chunks = chunk_text(text)
            print(f"Processing {filename} ({len(chunks)} chunks)...")
            count = upsert_chunks(index, filename, chunks)
            print(f"  Upserted: {count} vectors")

    print("\nIndex stats:")
    print(index.describe_index_stats())
