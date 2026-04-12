package com.example.demo.prediction;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;


public class PredictionRequest {

    @NotNull
    private Double avgTemperatureC;

    @NotNull
    private Double minTemperatureC;

    @NotNull
    private Double maxTemperatureC;

    @NotNull
    private Double humidityPercent;

    @NotNull
    private Double co2Ppm;

    @NotNull
    private Double lightIntensityLux;

    @NotNull
    private Double photoperiodHours;

    @NotNull
    private Double irrigationMm;

    @NotNull
    private Double fertilizerNKgHa;

    @NotNull
    private Double fertilizerPKgHa;

    @NotNull
    private Double fertilizerKKgHa;

    @NotNull
    private Double pestSeverity;

    @NotNull
    @JsonProperty("pH")
    @JsonAlias("ph")
    private Double pH;

    @NotBlank
    private String variety;

    public Double getAvgTemperatureC() {
        return avgTemperatureC;
    }

    public void setAvgTemperatureC(final Double avgTemperatureC) {
        this.avgTemperatureC = avgTemperatureC;
    }

    public Double getMinTemperatureC() {
        return minTemperatureC;
    }

    public void setMinTemperatureC(final Double minTemperatureC) {
        this.minTemperatureC = minTemperatureC;
    }

    public Double getMaxTemperatureC() {
        return maxTemperatureC;
    }

    public void setMaxTemperatureC(final Double maxTemperatureC) {
        this.maxTemperatureC = maxTemperatureC;
    }

    public Double getHumidityPercent() {
        return humidityPercent;
    }

    public void setHumidityPercent(final Double humidityPercent) {
        this.humidityPercent = humidityPercent;
    }

    public Double getCo2Ppm() {
        return co2Ppm;
    }

    public void setCo2Ppm(final Double co2Ppm) {
        this.co2Ppm = co2Ppm;
    }

    public Double getLightIntensityLux() {
        return lightIntensityLux;
    }

    public void setLightIntensityLux(final Double lightIntensityLux) {
        this.lightIntensityLux = lightIntensityLux;
    }

    public Double getPhotoperiodHours() {
        return photoperiodHours;
    }

    public void setPhotoperiodHours(final Double photoperiodHours) {
        this.photoperiodHours = photoperiodHours;
    }

    public Double getIrrigationMm() {
        return irrigationMm;
    }

    public void setIrrigationMm(final Double irrigationMm) {
        this.irrigationMm = irrigationMm;
    }

    public Double getFertilizerNKgHa() {
        return fertilizerNKgHa;
    }

    public void setFertilizerNKgHa(final Double fertilizerNKgHa) {
        this.fertilizerNKgHa = fertilizerNKgHa;
    }

    public Double getFertilizerPKgHa() {
        return fertilizerPKgHa;
    }

    public void setFertilizerPKgHa(final Double fertilizerPKgHa) {
        this.fertilizerPKgHa = fertilizerPKgHa;
    }

    public Double getFertilizerKKgHa() {
        return fertilizerKKgHa;
    }

    public void setFertilizerKKgHa(final Double fertilizerKKgHa) {
        this.fertilizerKKgHa = fertilizerKKgHa;
    }

    public Double getPestSeverity() {
        return pestSeverity;
    }

    public void setPestSeverity(final Double pestSeverity) {
        this.pestSeverity = pestSeverity;
    }

    public Double getPH() {
        return pH;
    }

    public void setPH(final Double pH) {
        this.pH = pH;
    }

    public String getVariety() {
        return variety;
    }

    public void setVariety(final String variety) {
        this.variety = variety;
    }

}
