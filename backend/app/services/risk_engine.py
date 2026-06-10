from typing import List
from app.models import DailyWeatherItem, RiskItem, HistoricalItem

class RiskEngine:
    @staticmethod
    def analyze_risks(forecast: List[DailyWeatherItem], historical: List[HistoricalItem]) -> List[RiskItem]:
        risks = []
        
        # Helper statistical aggregates
        max_temps = [item.temp_max for item in forecast]
        min_temps = [item.temp_min for item in forecast]
        daily_rains = [item.precipitation for item in forecast]
        soil_moistures = [item.soil_moisture for item in forecast]
        wind_speeds = [item.wind_speed for item in forecast]
        humidities = [item.relative_humidity for item in forecast]
        evap_losses = [item.evapotranspiration for item in forecast]
        
        # 1. HEATWAVE RISK
        consecutive_heat_days = 0
        max_consecutive_heat = 0
        for temp in max_temps:
            if temp > 40.0:
                consecutive_heat_days += 1
                max_consecutive_heat = max(max_consecutive_heat, consecutive_heat_days)
            else:
                consecutive_heat_days = 0
                
        if max_consecutive_heat >= 2:
            heat_sev = "CRITICAL"
            heat_en = "Severe heatwave alert. Temperatures exceeding 40°C for multiple consecutive days. Risk of severe crop stress."
            heat_te = "తీవ్రమైన వేడి తరంగాల హెచ్చరిక. వరుసగా 40°C కంటే ఎక్కువ ఉష్ణోగ్రతలు నమోదు. పంట ఎండిపోయే ప్రమాదం ఉంది."
        elif any(t > 40.0 for t in max_temps) or sum(1 for t in max_temps if t > 38.0) >= 3:
            heat_sev = "WARNING"
            heat_en = "High temperature warning. Heat levels exceeding seasonal norms. Keep soil irrigated."
            heat_te = "అధిక ఉష్ణోగ్రత హెచ్చరిక. సాధారణం కంటే ఎక్కువ వేడి నమోదు కావచ్చు. క్రమం తప్పకుండా నీరు పెట్టండి."
        elif any(t > 35.0 for t in max_temps):
            heat_sev = "ADVISORY"
            heat_en = "Moderate heat conditions. Normal agricultural precautions advised."
            heat_te = "సాధారణ వేడి వాతావరణం. ప్రాథమిక వ్యవసాయ జాగ్రత్తలు పాటించండి."
        else:
            heat_sev = "SAFE"
            heat_en = "Temperature is within normal crop growth levels."
            heat_te = "ఉష్ణోగ్రత పంట పెరుగుదలకు సాధారణ స్థాయిలోనే ఉంది."
        risks.append(RiskItem(key="heatwave", en_name="Heatwave", te_name="వేడిమి", severity=heat_sev, en_description=heat_en, te_description=heat_te))

        # 2. DROUGHT RISK
        # Read rainfall anomaly from historical item
        rain_item = next((item for item in historical if item.lbl == "Rainfall"), None)
        is_dry_anomaly = rain_item and "below" in rain_item.val
        low_soil_moisture_days = sum(1 for sm in soil_moistures if sm < 0.30)
        
        if is_dry_anomaly and sum(daily_rains) < 10.0 and low_soil_moisture_days >= 8:
            drought_sev = "CRITICAL"
            drought_en = "Severe drought conditions. Soil moisture is critically low with minimal rain forecast."
            drought_te = "తీవ్రమైన కరువు ముప్పు. తేమ శాతం చాలా తగ్గిపోయింది మరియు వర్షాలు పడే అవకాశం లేదు."
        elif sum(daily_rains) < 15.0 and low_soil_moisture_days >= 4:
            drought_sev = "WARNING"
            drought_en = "Moderate drought risk. Rainfall is below seasonal baselines and soil moisture is decreasing."
            drought_te = "మధ్యస్థ కరువు ప్రమాదం. వర్షపాతం సగటు కంటే తక్కువగా ఉంది, తేమ నిలుపుకోండి."
        elif low_soil_moisture_days >= 2:
            drought_sev = "ADVISORY"
            drought_en = "Dry spell warning. Monitor crop watering schedules closely."
            drought_te = "పొడి వాతావరణ హెచ్చరిక. సాగు నీటి ప్రణాళికను జాగ్రత్తగా గమనించండి."
        else:
            drought_sev = "SAFE"
            drought_en = "Drought risk is low. Satisfactory rainfall and soil moisture content."
            drought_te = "కరువు ప్రమాదం తక్కువ. తగినంత వర్షపాతం మరియు నేల తేమ ఉంది."
        risks.append(RiskItem(key="drought", en_name="Drought", te_name="కరువు", severity=drought_sev, en_description=drought_en, te_description=drought_te))

        # 3. FLOOD RISK
        max_24h_rain = max(daily_rains)
        if max_24h_rain > 50.0:
            flood_sev = "CRITICAL"
            flood_en = f"Flash flood risk. Extreme daily rainfall event forecast ({max_24h_rain:.1f}mm). Drain channels immediately."
            flood_te = f"వరద ముప్పు హెచ్చరిక. అత్యధిక ఏకదిన వర్షపాతం ({max_24h_rain:.1f}mm) నమోదు. పొలంలో నీటిని బయటకు పంపండి."
        elif max_24h_rain > 25.0 or sum(daily_rains) > 60.0:
            flood_sev = "WARNING"
            flood_en = "Waterlogging warning. Persistent rainfall may submerge low-lying fields."
            flood_te = "పంట మునిగిపోయే హెచ్చరిక. వర్షాల వల్ల లోతట్టు పొలాల్లో నీరు నిలిచే అవకాశం ఉంది."
        elif sum(daily_rains) > 15.0:
            flood_sev = "ADVISORY"
            flood_en = "Moderate rainfall. Ensure drainage channels are clear of debris."
            flood_te = "సాధారణ వర్షపాతం. నీటి కాలువలను శుభ్రంగా ఉంచుకోండి."
        else:
            flood_sev = "SAFE"
            flood_en = "No flood or waterlogging risks detected."
            flood_te = "వరదలు లేదా నీరు నిలిచే ముప్పు ఏమీ లేదు."
        risks.append(RiskItem(key="flood", en_name="Flood", te_name="వరద", severity=flood_sev, en_description=flood_en, te_description=flood_te))

        # 4. SOIL MOISTURE DROP RISK
        lowest_moisture = min(soil_moistures)
        if lowest_moisture < 0.25:
            soil_sev = "CRITICAL"
            soil_en = f"Critical soil moisture depletion ({lowest_moisture:.2f} ratio). Roots are starving for water."
            soil_te = f"నేల తేమ ప్రమాదకర స్థాయికి పడిపోయింది ({lowest_moisture:.2f}). వేర్లకు తక్షణ నీటి సదుపాయం అవసరం."
        elif lowest_moisture < 0.30:
            soil_sev = "WARNING"
            soil_en = f"Low soil moisture warning ({lowest_moisture:.2f}). Evaporation is high. Mulching recommended."
            soil_te = f"నేల తేమ తక్కువగా ఉంది ({lowest_moisture:.2f}). తేమ ఆవిరి అవకుండా మల్చింగ్ వేయండి."
        elif lowest_moisture < 0.35:
            soil_sev = "ADVISORY"
            soil_en = "Marginal soil moisture drop. Water evaporation rates are increasing."
            soil_te = "సాధారణ తేమ తగ్గింపు. నీరు ఆవిరి అయ్యే రేటు క్రమంగా పెరుగుతోంది."
        else:
            soil_sev = "SAFE"
            soil_en = "Soil moisture level is healthy and stable."
            soil_te = "నేలలో తగినంత తేమ శ్రేష్ఠమైన రీతిలో ఉంది."
        risks.append(RiskItem(key="soil_moisture", en_name="Soil Moisture", te_name="నేల తేమ", severity=soil_sev, en_description=soil_en, te_description=soil_te))

        # 5. HARVEST WINDOW
        consecutive_dry_days = 0
        max_consecutive_dry = 0
        for rain in daily_rains:
            if rain < 1.0:
                consecutive_dry_days += 1
                max_consecutive_dry = max(max_consecutive_dry, consecutive_dry_days)
            else:
                consecutive_dry_days = 0
                
        if max_consecutive_dry >= 7:
            harvest_sev = "SAFE" # SAFE means window is wide open and secure
            harvest_en = f"Optimal harvest window. {max_consecutive_dry} consecutive dry days forecast. Ideal crop harvesting conditions."
            harvest_te = f"పంట కోతకు అనుకూల సమయం. వరుసగా {max_consecutive_dry} రోజులు పొడి వాతావరణం. పంట కోయవచ్చు."
        elif max_consecutive_dry >= 5:
            harvest_sev = "ADVISORY"
            harvest_en = "Fair harvest window. A 5-day dry spell provides a suitable opportunity for early harvesting."
            harvest_te = "పంట కోతకు సాధారణ సమయం. వరుసగా 5 రోజులు వర్షం లేనందున కోత ప్రారంభించవచ్చు."
        elif sum(1 for r in daily_rains if r > 5.0) >= 3:
            harvest_sev = "CRITICAL"
            harvest_en = "Unfavorable harvest window. Frequent rain events will spoil cut crops. Postpone harvesting."
            harvest_te = "కోతకు అత్యంత ప్రమాదకరం. తరచుగా కురిసే వర్షాల వల్ల పంట పాడవుతుంది. కోత వాయిదా వేయండి."
        else:
            harvest_sev = "WARNING"
            harvest_en = "Unstable harvest window. Rainy intervals forecast. Monitor weather maps before cutting."
            harvest_te = "అస్థిరమైన కోత వాతావరణం. అప్పుడప్పుడు వర్షాలు పడవచ్చు. జాగ్రత్త వహించండి."
        risks.append(RiskItem(key="harvest_window", en_name="Harvest Window", te_name="కోత సమయం", severity=harvest_sev, en_description=harvest_en, te_description=harvest_te))

        # 6. WIND DAMAGE
        max_wind = max(wind_speeds)
        if max_wind > 40.0:
            wind_sev = "CRITICAL"
            wind_en = f"Dangerous wind gusts warning ({max_wind:.1f} km/h). Structural and crop lodging damage likely. Install supports."
            wind_te = f"తీవ్రమైన గాలులు వీచే ప్రమాదం ({max_wind:.1f} km/h). పంట పడిపోయే ప్రమాదం ఉంది. ఊతాలు ఏర్పాటు చేయండి."
        elif max_wind > 25.0:
            wind_sev = "WARNING"
            wind_en = f"High winds warning ({max_wind:.1f} km/h). Protective barriers or crop stakes recommended."
            wind_te = f"బలమైన ఈదురు గాలుల హెచ్చరిక ({max_wind:.1f} km/h). పంట రక్షణ చర్యలు చేపట్టండి."
        elif max_wind > 15.0:
            wind_sev = "ADVISORY"
            wind_en = "Moderate winds. Safe for standard farm operations."
            wind_te = "సాధారణ గాలులు వీస్తాయి. వ్యవసాయ పనులకు ఢోకా లేదు."
        else:
            wind_sev = "SAFE"
            wind_en = "Calm wind conditions. Safe for spraying pesticides."
            wind_te = "ప్రశాంతమైన గాలి వాతావరణం. మందులు పిచికారీకి అనుకూలం."
        risks.append(RiskItem(key="wind", en_name="Wind Damage", te_name="గాలి తీవ్రత", severity=wind_sev, en_description=wind_en, te_description=wind_te))

        # 7. PEST RISK
        # Pest risk: High humidity (>80%) + Warm temperature (>30°C)
        pest_days = sum(1 for i in range(len(forecast)) if humidities[i] > 80.0 and (max_temps[i] + min_temps[i])/2.0 > 30.0)
        
        if pest_days >= 3:
            pest_sev = "CRITICAL"
            pest_en = "Critical pest outbreak alert. Extended hot and humid periods create high vectors for planthoppers and fungal diseases."
            pest_te = "తీవ్రమైన తెగుళ్ల ముప్పు. ఉక్కపోత వాతావరణం వల్ల పురుగులు మరియు శిలీంధ్ర తెగుళ్లు వ్యాపించే ప్రమాదం చాలా ఎక్కువ."
        elif any(humidities[i] > 70.0 and max_temps[i] > 28.0 for i in range(len(forecast))):
            pest_sev = "WARNING"
            pest_en = "Elevated pest risk. Warm and humid intervals may trigger crop blight or sucking pest activity. Inspect fields."
            pest_te = "తెగుళ్ల ముప్పు హెచ్చరిక. వెచ్చని మరియు తేమతో కూడిన వాతావరణం వల్ల పురుగుల ఉధృతి పెరగవచ్చు, నిఘా పెట్టండి."
        else:
            pest_sev = "SAFE"
            pest_en = "Low pest risk. Climatic conditions do not favor disease spread."
            pest_te = "తెగుళ్ళ ముప్పు తక్కువగా ఉంది. వాతావరణ పరిస్థితులు వ్యాప్తికి అనుకూలంగా లేవు."
        risks.append(RiskItem(key="pest", en_name="Pest Risk", te_name="తెగుళ్లు", severity=pest_sev, en_description=pest_en, te_description=pest_te))

        # 8. WATER LOSS / EVAPOTRANSPIRATION RISK
        max_evap = max(evap_losses)
        high_evap_days = sum(1 for ev in evap_losses if ev > 5.0)
        
        if max_evap > 5.0 and high_evap_days >= 3:
            evap_sev = "CRITICAL"
            evap_en = f"Extreme water loss rate ({max_evap:.1f}mm/day). Transpiration rates are unsustainable. Irrigate deeply."
            evap_te = f"అధిక నీటి నష్టం రేటు ({max_evap:.1f}mm/రోజు). నీరు వేగంగా ఆవిరవుతోంది. సమృద్ధిగా నీరు పెట్టండి."
        elif max_evap > 4.0:
            evap_sev = "WARNING"
            evap_en = f"Elevated crop water evaporation ({max_evap:.1f}mm/day). Soil moisture is drying quickly. Protect topsoil."
            evap_te = f"పంట తేమ ఆవిరి అధికంగా ఉంది ({max_evap:.1f}mm/రోజు). భూమి త్వరగా ఎండిపోతుంది, తేమను కాపాడండి."
        elif max_evap > 3.0:
            evap_sev = "ADVISORY"
            evap_en = "Moderate evapotranspiration rate. Maintain regular crop watering intervals."
            evap_te = "సాధారణ ఎవాపోట్రాన్స్పిరేషన్. పంట తడులను క్రమపద్ధతిలో నిర్వహించండి."
        else:
            evap_sev = "SAFE"
            evap_en = "Low water loss rate. Minimal evaporation strain on the crop."
            evap_te = "తక్కువ నీటి ఆవిరి రేటు. పంటలకు నీటి ఎద్దడి ముప్పు లేదు."
        risks.append(RiskItem(key="evapotranspiration", en_name="Water Loss", te_name="నీటి నష్టం", severity=evap_sev, en_description=evap_en, te_description=evap_te))

        return risks
