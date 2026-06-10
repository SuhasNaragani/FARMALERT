import uvicorn
import os
from dotenv import load_dotenv

# Load env file from current directory
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"Starting FarmAlert backend on http://{host}:{port}...")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
