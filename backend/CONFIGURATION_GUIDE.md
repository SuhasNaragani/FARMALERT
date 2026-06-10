# FarmAlert Environment Configuration & API Integration Guide

This guide provides a comprehensive technical reference for setting up, managing, and securing environment variables and API integrations within the **FarmAlert** FastAPI backend.

---

## 1. Overview of Configuration Management

FarmAlert uses a decoupled settings management design. Application configuration parameters are kept separate from the codebase, satisfying the **Twelve-Factor App** methodology.

```
+------------------------------------+
|         backend/.env file          |
|  (Contains raw key-value secrets)  |
+-----------------+------------------+
                  │
                  │ load_dotenv()
                  ▼
+-----------------+------------------+
|      backend/app/config.py         |
|  (Pulls and casts OS environment)  |
+-----------------+------------------+
                  │
                  │ settings.GEMINI_API_KEY
                  ▼
+-----------------+------------------+
|    backend/app/services/gemini.py  |
|  (Initializes GenerativeModel API) |
+------------------------------------+
```

1. **Variables File (`.env`)**: A local, un-tracked configuration file containing environment variables and API credentials.
2. **Casting Layer ([config.py](file:///d:/VVT(A%202%20Z)/SKILLS%20AGENT/F/backend/app/config.py))**: Reads variables using `python-dotenv` and casts them into clean Python types (e.g., ports to integers).
3. **Execution Layer**: Application services reference the global `settings` object instead of querying `os.getenv` repeatedly.

---

## 2. Environment Variables Reference

| Variable | Type | Default | Description | Required in Production |
| :--- | :--- | :--- | :--- | :--- |
| `HOST` | `str` | `0.0.0.0` | IP address binding for the Uvicorn ASGI server. `0.0.0.0` binds to all network interfaces. | Yes |
| `PORT` | `int` | `8000` | Network port for binding the API server. | Yes |
| `GEMINI_API_KEY` | `str` | `""` (Empty string) | API authentication token for the Google Generative AI (Gemini) service. | Yes (for live AI features) |

### Note on Legacy Comments
> [!NOTE]
> The comments in `.env` and `.env.example` reference the **Anthropic Claude API Key** (`ANTHROPIC_API_KEY`). However, the active codebase compiles, validates, and initializes using **Google Gemini** (`GEMINI_API_KEY`). Ensure you configure `GEMINI_API_KEY` for live AI advice.

---

## 3. API Key & Authentication Flow

### Google Gemini API Configuration
The backend integrates with the Google Generative AI Python SDK (`google-generativeai==0.5.4`).

#### Initialization Workflow
1. At server startup, the backend verifies the existence of `GEMINI_API_KEY` in environment variables:
   ```python
   # main.py
   if os.getenv("GEMINI_API_KEY"):
       print("Gemini API connected - real AI advice enabled")
   else:
       print("No Gemini key - using templates")
   ```
2. When a farm analysis is requested, `gemini_service.py` runs `get_working_model()`:
   * Confirms `api_key` existence.
   * Calls `genai.configure(api_key=api_key)`.
   * Queries `genai.list_models()` to check for supported text generation capabilities.
   * Targets preferred models in order:
     1. `models/gemini-2.0-flash-lite`
     2. `models/gemini-2.0-flash`
     3. `models/gemini-flash-lite-latest`
     4. `models/gemini-flash-latest`
   * Performs a verification call (`model.generate_content("Hi")`).
   * Caches the successful model string inside a global variable `_DETECTED_MODEL` for future calls.

#### Fallback Safety Net
If the `GEMINI_API_KEY` is missing, invalid, or rate-limited (HTTP 429), the API catches the exception and switches to `_generate_template_plan()`. This serves pre-calculated, localized advisories from a template database, keeping the app operational offline.

---

## 4. Local vs. Production Configurations

### Local Development Setup
1. Duplicate the example template:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit `backend/.env` and insert your developer configurations:
   ```env
   HOST=127.0.0.1
   PORT=8000
   GEMINI_API_KEY=your_development_api_key_here
   ```

### Production Deployment Setup
In cloud environments (e.g., Render, Railway, AWS ECS, Heroku), **do not upload the `.env` file**. Instead, register variables directly in the provider's Dashboard/Environment settings:

```
                  [ Cloud Provider Dashboard ]
                  ┌────────────────────────┐
                  │ Key:   GEMINI_API_KEY  │
                  │ Value: AIzaSyD9...      │
                  └────────────────────────┘
                              │
                              ▼ Inject at container startup
                  [ Uvicorn Production Container ]
```

* **Host Binding**: Set `HOST` to `0.0.0.0` so the container handles traffic routed by the cloud load balancer.
* **Dynamic Ports**: Set `PORT` based on the environment variable provided by the platform (e.g., Render dynamically assigns `$PORT`).

---

## 5. Security Best Practices for Secret Management

> [!CAUTION]
> **Never commit `.env` or raw API keys to Git repositories.** Exposing keys on GitHub or GitLab can result in quota exhaustion, unexpected financial costs, and credentials suspension.

* **Git Ignore Check**: Ensure your root `.gitignore` contains the following rule:
  ```gitignore
  # Exclude local environment configurations
  .env
  .env.local
  ```
* **Key Rotation**: Rotate your Google Gemini keys every 90 days via the Google AI Studio console.
* **IP Restriction**: Restrict Google API keys to request traffic only originating from your production server's static IP range.

---

## 6. Troubleshooting Configuration Issues

### Issue 1: "No Gemini key - using templates" printed on startup
* **Cause**: FastAPI cannot read your `GEMINI_API_KEY`.
* **Resolution**: 
  1. Confirm the `.env` file is in the root backend directory (`backend/.env`).
  2. Ensure there are no spaces around the `=` sign (e.g., write `GEMINI_API_KEY=key`, not `GEMINI_API_KEY = key`).
  3. Verify the key variable name is spelled exactly as `GEMINI_API_KEY`.

### Issue 2: FastAPI throws `ValidationError` or port casting errors
* **Cause**: `PORT` variable is set to a non-numeric value.
* **Resolution**: Ensure `PORT` contains only integers (e.g., `8000`).

### Issue 3: Gemini requests timeout or return rate limits
* **Cause**: High traffic or key exhaustion.
* **Resolution**: The system automatically switches to the offline templates. Check your Google AI Studio console to review billing quotas and limit metrics.
