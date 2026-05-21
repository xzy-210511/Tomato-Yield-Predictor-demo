import os

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

from predict_growth_model import predict_growth


def main() -> None:
    start_day = 15
    forecast_days = 51
    sample_input = {
        "ec": "EC6",
        "light": "high light",
        "start_day": start_day,
        "maturity_day": start_day + forecast_days,
        "environment": {
            "t_air_mean": 24.8,
            "rh_mean": 68.5,
            "co2_mean": 440.0,
            "par_lamp_daily": 560.0,
            "light_on_hours_daily": 8.0,
        },
    }

    result = predict_growth(sample_input)
    print(result)


if __name__ == "__main__":
    main()
