import os

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

from integrated_tomato_model import predict_integrated_tomato


def main() -> None:
    sample_input = {
        "ec": "EC6",
        "light": "high light",
        "start_day": 15,
        "maturity_day": 66,
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
        "environment": {
            "t_air_mean": 24.8,
            "rh_mean": 68.5,
            "co2_mean": 440.0,
            "par_lamp_daily": 560.0,
            "light_on_hours_daily": 8.0,
        },
    }

    result = predict_integrated_tomato(sample_input)
    print(result)


if __name__ == "__main__":
    main()
