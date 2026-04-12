package com.example.demo.prediction;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PredictionResponse {

    @JsonProperty("predicted_yield_kg_per_m2")
    private Double predictedYieldKgPerM2;

    public Double getPredictedYieldKgPerM2() {
        return predictedYieldKgPerM2;
    }

    public void setPredictedYieldKgPerM2(final Double predictedYieldKgPerM2) {
        this.predictedYieldKgPerM2 = predictedYieldKgPerM2;
    }

}
