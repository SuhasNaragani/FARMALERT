from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class FarmInput(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude of the farm")
    lng: float = Field(..., ge=-180, le=180, description="Longitude of the farm")
    crop_type: str = Field(..., max_length=50, description="Type of selected crop (e.g., paddy, cotton, soybean, chilli, turmeric)")
    plot_size: float = Field(..., gt=0, le=10000, description="Plot size in acres (always converted to acres before sending)")
    plot_size_original: Optional[float] = Field(None, gt=0, le=100000, description="Original value entered by farmer before unit conversion")
    plot_size_unit: Optional[str] = Field(None, max_length=20, description="Original unit selected by farmer (acres, guntas, cents, hectares)")
    language: str = Field(..., max_length=20, description="User preferred language (e.g., telugu, english)")
    location_name: Optional[str] = Field("Telangana Farm", max_length=200, description="Name of the location")
    crop_stage: Optional[str] = Field(None, max_length=50, description="Current growth stage of the crop (e.g., flowering, tillering)")
    soil_type: Optional[str] = Field(None, max_length=100, description="Type of soil in the farm (e.g., Black Cotton Soil, Red Sandy Soil)")

class DailyWeatherItem(BaseModel):
    day: str = Field(..., description="Day index (e.g., D1, D2, ...)")
    date: str = Field(..., description="Actual calendar date YYYY-MM-DD")
    temp_max: float = Field(..., description="Max temperature in Celsius")
    temp_min: float = Field(..., description="Min temperature in Celsius")
    precipitation: float = Field(..., description="Daily precipitation sum in mm")
    soil_moisture: float = Field(..., description="Soil moisture percentage or ratio")
    wind_speed: float = Field(..., description="Wind speed in km/h")
    uv_index: float = Field(..., description="UV Index max")
    evapotranspiration: float = Field(..., description="Evapotranspiration in mm")
    relative_humidity: float = Field(..., description="Daily mean relative humidity")

class RiskItem(BaseModel):
    key: str = Field(..., description="Unique slug for the risk type")
    en_name: str = Field(..., description="English title")
    te_name: str = Field(..., description="Telugu title")
    severity: str = Field(..., description="SAFE, WARNING, CRITICAL, or ADVISORY")
    en_description: str = Field(..., description="English analysis description")
    te_description: str = Field(..., description="Telugu analysis description")

class HistoricalItem(BaseModel):
    lbl: str = Field(..., description="English baseline label (e.g. Temperature)")
    te: str = Field(..., description="Telugu baseline label")
    val: str = Field(..., description="Anomalous change string (e.g. +3°C above)")
    c: str = Field(..., description="Color hex code to display (e.g. #dc2626)")

class ActionItem(BaseModel):
    icon_type: str = Field(..., description="Icon identifier for frontend (e.g., check, warning)")
    en: str = Field(..., description="English recommendation text")
    te: str = Field(..., description="Telugu recommendation text")

class ActionPlan(BaseModel):
    today: List[ActionItem]
    week: List[ActionItem]
    month: List[ActionItem]

class SummarySectionItem(BaseModel):
    title_en: str
    title_te: str
    text_en: str
    text_te: str
    color: str
    icon_type: str

class FarmSummary(BaseModel):
    weather: SummarySectionItem
    soil: SummarySectionItem
    risk: SummarySectionItem
    recommendation: SummarySectionItem

class NdviData(BaseModel):
    ndvi: float
    ndvi_previous: float
    trend: float
    trend_direction: str
    status: str
    status_te: str
    color: str
    cause_en: str
    cause_te: str
    history: List[float]
    source: str
    evi: Optional[float] = None
    lst_celsius: Optional[float] = None
    lst_vs_air: Optional[float] = None
    lai: Optional[float] = None
    lai_optimal_min: Optional[float] = None
    lai_optimal_max: Optional[float] = None

class ClimateRiskAnalysisResponse(BaseModel):
    location: Dict[str, float]
    selected_crop: str
    plot_size: float
    language: str
    location_name: str
    weather_data: List[DailyWeatherItem]
    risks: List[RiskItem]
    historical: List[HistoricalItem]
    action_plan: ActionPlan
    farm_summary: FarmSummary
    stage_advice_en: List[str] = Field(default_factory=list)
    stage_advice_te: List[str] = Field(default_factory=list)
    irrigation_advice_en: List[str] = Field(default_factory=list)
    irrigation_advice_te: List[str] = Field(default_factory=list)
    ndvi: Optional[NdviData] = None
    water_requirement: Optional[Dict[str, Any]] = None
