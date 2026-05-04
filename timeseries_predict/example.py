from predict_growth_model import predict_growth


result = predict_growth(
    {
        "start_day": 15,
        "ec": "EC6",
        "light": "high light",
        "environment": {
            "t_air_mean": 24.8,
            "rh_mean": 68.5,
            "co2_mean": 440.0,
            "par_lamp_daily": 560.0,
            "light_on_hours_daily": 8.0,
        },
    }
)

print(result)
