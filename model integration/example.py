import os

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

from integrated_tomato_model import predict_integrated_tomato


def main() -> None:
    sample_input = {
        "ec": "EC6",
        "light": "high light",
        "start_day": 15,
        "forecast_days": 51,
        "variety": "Roma",
        "avg_temperature_C": 25,
        "min_temperature_C": 22,
        "max_temperature_C": 28,
        "humidity_percent": 70,
        "co2_ppm": 800,
        "light_intensity_lux": 30000,
        "photoperiod_hours": 12,
        "irrigation_mm": 7,
        "fertilizer_N_kg_ha": 140,
        "fertilizer_P_kg_ha": 60,
        "fertilizer_K_kg_ha": 140,
        "pest_severity": 1,
        "soil_pH": 6.5,
        "par_lamp_daily": 560.0,
    }

    result = predict_integrated_tomato(sample_input)
    print(result)


if __name__ == "__main__":
    main()
