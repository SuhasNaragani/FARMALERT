import logging
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.models import FarmInput, ClimateRiskAnalysisResponse
from app.services.weather import WeatherService
from app.services.climate import ClimateService
from app.services.risk_engine import RiskEngine
from app.services.gemini_service import GeminiService
from app.services.ndvi import fetch_ndvi
from app.services.water import WaterService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("farmalert.main")

if os.getenv("GEMINI_API_KEY"):
    print("Gemini API connected - real AI advice enabled")
else:
    print("No Gemini key - using templates")

# ─── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="FarmAlert API",
    description="Climate Risk Forecaster Backend for Smallholder Farmers in Telangana",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Reads a comma-separated list from ALLOWED_ORIGINS env var.
# Set to your production frontend URL before deploying.
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Welcome to FarmAlert Climate Risk Forecaster API"}

@app.post("/api/analyze", response_model=ClimateRiskAnalysisResponse)
@limiter.limit("10/minute")
async def analyze_farm(request: Request, farm_input: FarmInput):
    logger.info(f"Received farm analysis request: crop={farm_input.crop_type}, location={farm_input.location_name}, lat={farm_input.lat}, lng={farm_input.lng}")
    print(f"Plot size: {farm_input.plot_size} acres")
    print(f"Plot size original: {farm_input.plot_size_original} {farm_input.plot_size_unit}")
    print(f"Crop stage: {farm_input.crop_stage}")
    print(f"Soil type: {farm_input.soil_type}")
    print(f"Generating stage-specific plan...")
    try:
        # 1. Fetch 14-day weather forecast asynchronously
        weather_data = await WeatherService.get_14day_forecast(farm_input.lat, farm_input.lng)
        
        # 2. Fetch historical baseline from NASA POWER (which also calculates anomalies vs current weather forecast)
        historical_data = await ClimateService.get_historical_baseline(farm_input.lat, farm_input.lng, weather_data)
        
        # 3. Analyze risks based on weather forecast and historical data
        risks = RiskEngine.analyze_risks(weather_data, historical_data)
        
        # 4. Fetch NDVI, EVI, LST, LAI from NASA MODIS
        air_temp = weather_data[0].temp_max if weather_data else None
        ndvi_data = await fetch_ndvi(
            farm_input.lat, farm_input.lng,
            air_temp=air_temp,
            crop_type=farm_input.crop_type,
        )
        print(f"NDVI for {farm_input.location_name}: {ndvi_data['ndvi']} ({ndvi_data['status']})")

        # 5. Generate Gemini AI adaptation plan and summaries (with local templates fallback)
        action_plan, farm_summary, stage_adv_en, stage_adv_te, irr_adv_en, irr_adv_te = await GeminiService.generate_adaptation_plan(
            crop=farm_input.crop_type,
            plot_size=farm_input.plot_size,
            weather=weather_data,
            risks=risks,
            crop_stage=farm_input.crop_stage,
            soil_type=farm_input.soil_type,
            location_name=farm_input.location_name or "Telangana Farm",
        )

        # 5.5. Calculate Crop Water Requirement
        water_data = WaterService.calculate_requirement(
            crop_type=farm_input.crop_type,
            crop_stage=farm_input.crop_stage,
            plot_size=farm_input.plot_size,
            weather_data=weather_data
        )

        # 6. Assemble response
        response = ClimateRiskAnalysisResponse(
            location={"lat": farm_input.lat, "lng": farm_input.lng},
            selected_crop=farm_input.crop_type,
            plot_size=farm_input.plot_size,
            language=farm_input.language,
            location_name=farm_input.location_name or "Telangana Farm",
            weather_data=weather_data,
            risks=risks,
            historical=historical_data,
            action_plan=action_plan,
            farm_summary=farm_summary,
            stage_advice_en=stage_adv_en,
            stage_advice_te=stage_adv_te,
            irrigation_advice_en=irr_adv_en,
            irrigation_advice_te=irr_adv_te,
            ndvi=ndvi_data,
            water_requirement=water_data,
        )
        
        logger.info("Successfully completed farm risk analysis.")
        return response
        
    except Exception as e:
        logger.exception("An error occurred during farm risk analysis")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
