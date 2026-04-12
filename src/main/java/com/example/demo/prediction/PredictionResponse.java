package com.example.demo.prediction;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PredictionResponse {

    private Long predictionRecordId;

    @JsonProperty("predicted_yield_kg_per_m2")
    private Double predictedYieldKgPerM2;

    public Long getPredictionRecordId() {
        return predictionRecordId;
    }

    public void setPredictionRecordId(final Long predictionRecordId) {
        this.predictionRecordId = predictionRecordId;
    }

    public Double getPredictedYieldKgPerM2() {
        return predictedYieldKgPerM2;
    }

    public void setPredictedYieldKgPerM2(final Double predictedYieldKgPerM2) {
        this.predictedYieldKgPerM2 = predictedYieldKgPerM2;
    }

}
