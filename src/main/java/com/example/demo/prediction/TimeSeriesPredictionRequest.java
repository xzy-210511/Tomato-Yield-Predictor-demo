package com.example.demo.prediction;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TimeSeriesPredictionRequest {

    @NotNull
    private Integer startDay;

    private Integer maturityDay;

    @NotBlank
    private String ec;

    @NotBlank
    private String light;

    @Valid
    @NotNull
    private Environment environment;

    public Integer getStartDay() {
        return startDay;
    }

    public void setStartDay(final Integer startDay) {
        this.startDay = startDay;
    }

    public Integer getMaturityDay() {
        return maturityDay;
    }

    public void setMaturityDay(final Integer maturityDay) {
        this.maturityDay = maturityDay;
    }

    public String getEc() {
        return ec;
    }

    public void setEc(final String ec) {
        this.ec = ec;
    }

    public String getLight() {
        return light;
    }

    public void setLight(final String light) {
        this.light = light;
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(final Environment environment) {
        this.environment = environment;
    }

    public static class Environment {

        @NotNull
        @JsonProperty("tAirMean")
        private Double tAirMean;

        @NotNull
        @JsonProperty("rhMean")
        private Double rhMean;

        @NotNull
        @JsonProperty("co2Mean")
        private Double co2Mean;

        @NotNull
        @JsonProperty("parLampDaily")
        private Double parLampDaily;

        @NotNull
        @JsonProperty("lightOnHoursDaily")
        private Double lightOnHoursDaily;

        public Double getTAirMean() {
            return tAirMean;
        }

        public void setTAirMean(final Double tAirMean) {
            this.tAirMean = tAirMean;
        }

        public Double getRhMean() {
            return rhMean;
        }

        public void setRhMean(final Double rhMean) {
            this.rhMean = rhMean;
        }

        public Double getCo2Mean() {
            return co2Mean;
        }

        public void setCo2Mean(final Double co2Mean) {
            this.co2Mean = co2Mean;
        }

        public Double getParLampDaily() {
            return parLampDaily;
        }

        public void setParLampDaily(final Double parLampDaily) {
            this.parLampDaily = parLampDaily;
        }

        public Double getLightOnHoursDaily() {
            return lightOnHoursDaily;
        }

        public void setLightOnHoursDaily(final Double lightOnHoursDaily) {
            this.lightOnHoursDaily = lightOnHoursDaily;
        }
    }
}
