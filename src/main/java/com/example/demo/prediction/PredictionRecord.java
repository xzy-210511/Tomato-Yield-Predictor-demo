package com.example.demo.prediction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;


@Entity
@Table(name = "prediction_records")
public class PredictionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "avg_temperature_c", nullable = false)
    private Double avgTemperatureC;

    @Column(name = "min_temperature_c", nullable = false)
    private Double minTemperatureC;

    @Column(name = "max_temperature_c", nullable = false)
    private Double maxTemperatureC;

    @Column(name = "humidity_percent", nullable = false)
    private Double humidityPercent;

    @Column(name = "co2_ppm", nullable = false)
    private Double co2Ppm;

    @Column(name = "light_intensity_lux", nullable = false)
    private Double lightIntensityLux;

    @Column(name = "photoperiod_hours", nullable = false)
    private Double photoperiodHours;

    @Column(name = "irrigation_mm", nullable = false)
    private Double irrigationMm;

    @Column(name = "fertilizer_n_kg_ha", nullable = false)
    private Double fertilizerNKgHa;

    @Column(name = "fertilizer_p_kg_ha", nullable = false)
    private Double fertilizerPKgHa;

    @Column(name = "fertilizer_k_kg_ha", nullable = false)
    private Double fertilizerKKgHa;

    @Column(name = "pest_severity", nullable = false)
    private Double pestSeverity;

    @Column(name = "ph", nullable = false)
    private Double pH;

    @Column(nullable = false, length = 50)
    private String variety;

    @Column(name = "predicted_yield_kg_per_m2", nullable = false)
    private Double predictedYieldKgPerM2;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public static PredictionRecord from(final PredictionRequest request, final PredictionResponse response) {
        final PredictionRecord record = new PredictionRecord();
        record.avgTemperatureC = request.getAvgTemperatureC();
        record.minTemperatureC = request.getMinTemperatureC();
        record.maxTemperatureC = request.getMaxTemperatureC();
        record.humidityPercent = request.getHumidityPercent();
        record.co2Ppm = request.getCo2Ppm();
        record.lightIntensityLux = request.getLightIntensityLux();
        record.photoperiodHours = request.getPhotoperiodHours();
        record.irrigationMm = request.getIrrigationMm();
        record.fertilizerNKgHa = request.getFertilizerNKgHa();
        record.fertilizerPKgHa = request.getFertilizerPKgHa();
        record.fertilizerKKgHa = request.getFertilizerKKgHa();
        record.pestSeverity = request.getPestSeverity();
        record.pH = request.getPH();
        record.variety = request.getVariety();
        record.predictedYieldKgPerM2 = response.getPredictedYieldKgPerM2();
        record.modelVersion = "gradient-boosting-v1";
        return record;
    }

    public Long getId() {
        return id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
