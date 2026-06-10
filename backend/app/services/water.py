from typing import List, Dict, Any
from datetime import datetime
from app.models import DailyWeatherItem

# FAO Standard Kc values
CROP_COEFFICIENTS = {
    "paddy": {
        "nursery": 1.05,
        "transplanting": 1.10,
        "tillering": 1.10,
        "flowering": 1.25,
        "grain_filling": 1.20,
        "harvest": 0.75
    },
    "cotton": {
        "germination": 0.45,
        "vegetative": 0.75,
        "flowering": 1.15,
        "boll_formation": 1.15,
        "harvest": 0.65
    },
    "chilli": {
        "seedling": 0.60,
        "vegetative": 0.85,
        "flowering": 1.05,
        "fruiting": 1.05,
        "harvest": 0.80
    },
    "soybean": {
        "germination": 0.40,
        "vegetative": 0.80,
        "flowering": 1.15,
        "pod_filling": 1.15,
        "harvest": 0.50
    },
    "turmeric": {
        "planting": 0.50,
        "vegetative": 1.00,
        "rhizome_development": 1.10,
        "harvest": 0.75
    }
}

class WaterService:
    @staticmethod
    def get_kc(crop_type: str, crop_stage: str) -> tuple[float, str]:
        c_type = (crop_type or "").lower().strip()
        if "chilli" in c_type:
            c_type = "chilli"
        
        if c_type not in CROP_COEFFICIENTS:
            c_type = "paddy"
            
        stages = CROP_COEFFICIENTS[c_type]
        c_stage = (crop_stage or "").lower().strip()
        
        # Normalize frontend stage names to match FAO keys
        if c_stage == "rhizome_dev":
            c_stage = "rhizome_development"
            
        # Try direct match
        if c_stage in stages:
            return stages[c_stage], c_stage
            
        # Try partial match
        for k in stages.keys():
            if k in c_stage or c_stage in k:
                return stages[k], k
                
        # Default to first stage if not found
        default_stage = list(stages.keys())[0]
        return stages[default_stage], default_stage

    @staticmethod
    def calculate_requirement(
        crop_type: str,
        crop_stage: str,
        plot_size: float,
        weather_data: List[DailyWeatherItem]
    ) -> Dict[str, Any]:
        if not weather_data:
            return {}
            
        kc, crop_stage_used = WaterService.get_kc(crop_type, crop_stage)
        
        # Day 1 (Today) calculations
        today_weather = weather_data[0]
        today_et0 = today_weather.evapotranspiration
        today_water_mm = today_et0 * kc
        today_rain_mm = today_weather.precipitation
        today_net_irrigation_mm = max(0.0, today_water_mm - today_rain_mm)
        
        today_litres = today_water_mm * 4046.86 * plot_size
        today_litres_needed = float(round(today_litres / 100.0) * 100)
        
        # Print debug statements exactly as requested
        print(f"Water needed today: {today_litres:.0f}L")
        print(f"Kc used: {kc} for {crop_type}/{crop_stage}")
        
        # 14 days breakdown
        daily_breakdown = []
        for i, weather in enumerate(weather_data[:14]):
            day_et0 = weather.evapotranspiration
            day_water_mm = day_et0 * kc
            day_rain_mm = weather.precipitation
            net_irrigation_mm = max(0.0, day_water_mm - day_rain_mm)
            net_litres = net_irrigation_mm * 4046.86 * plot_size
            
            # Format date: e.g. "Jun 5"
            try:
                dt = datetime.strptime(weather.date, "%Y-%m-%d")
                formatted_date = dt.strftime("%b ") + str(dt.day)
            except Exception:
                formatted_date = weather.date
                
            daily_breakdown.append({
                "day": weather.day,
                "date": formatted_date,
                "et0": float(day_et0),
                "water_needed_mm": float(day_water_mm),
                "rain_mm": float(day_rain_mm),
                "net_irrigation_mm": float(net_irrigation_mm),
                "litres_needed": float(round(net_litres / 100.0) * 100),
                "irrigation_needed": net_irrigation_mm > 0.0
            })
            
        # Weekly total (D1 to D7)
        weekly_total_litres = float(round(sum(day["litres_needed"] for day in daily_breakdown[:7]) / 100.0) * 100)
        
        # Irrigation frequency based on today's net irrigation
        if today_net_irrigation_mm > 5.0:
            irrigation_frequency = "Daily"
        elif today_net_irrigation_mm > 3.0:
            irrigation_frequency = "Every 2 days"
        elif today_net_irrigation_mm > 1.0:
            irrigation_frequency = "Every 3 days"
        else:
            irrigation_frequency = "Weekly"
            
        return {
            "today_et0": float(today_et0),
            "today_kc": float(kc),
            "today_water_mm": float(today_water_mm),
            "today_rain_mm": float(today_rain_mm),
            "today_net_irrigation_mm": float(today_net_irrigation_mm),
            "today_litres_needed": float(today_litres_needed),
            "weekly_total_litres": float(weekly_total_litres),
            "daily_breakdown": daily_breakdown,
            "irrigation_frequency": irrigation_frequency,
            "best_irrigation_time": "6:00 AM",
            "kc_used": float(kc),
            "crop_stage_used": crop_stage_used
        }
