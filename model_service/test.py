from predict_field_model import predict_yield

result = predict_yield({
    "avg_temperature_C": 25,
    "min_temperature_C": 24,
    "max_temperature_C": 27,
    "humidity_percent": 70,
    "co2_ppm": 800,
    "light_intensity_lux": 30000,
    "photoperiod_hours": 12,
    "irrigation_mm": 7,
    "fertilizer_N_kg_ha": 140,
    "fertilizer_P_kg_ha": 60,
    "fertilizer_K_kg_ha": 140,
    "pest_severity": 1,
    "pH": 6.5,
    "variety": "Roma"
})

print(result)