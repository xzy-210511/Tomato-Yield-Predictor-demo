package com.example.demo.prediction;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class TimeSeriesPredictionResponse {

    private String ec;
    private String light;

    @JsonProperty("start_day")
    private Integer startDay;

    @JsonProperty("maturity_day")
    private Integer maturityDay;

    @JsonProperty("state_start_day")
    private Integer stateStartDay;

    @JsonProperty("start_state_source")
    private String startStateSource;

    @JsonProperty("prediction_count")
    private Integer predictionCount;

    private List<PredictionPoint> predictions;

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

    public Integer getStateStartDay() {
        return stateStartDay;
    }

    public void setStateStartDay(final Integer stateStartDay) {
        this.stateStartDay = stateStartDay;
    }

    public String getStartStateSource() {
        return startStateSource;
    }

    public void setStartStateSource(final String startStateSource) {
        this.startStateSource = startStateSource;
    }

    public Integer getPredictionCount() {
        return predictionCount;
    }

    public void setPredictionCount(final Integer predictionCount) {
        this.predictionCount = predictionCount;
    }

    public List<PredictionPoint> getPredictions() {
        return predictions;
    }

    public void setPredictions(final List<PredictionPoint> predictions) {
        this.predictions = predictions;
    }

    public static class PredictionPoint {

        @JsonProperty("days_after_transplant")
        private Integer daysAfterTransplant;

        @JsonProperty("plant_height_cm")
        private Double plantHeightCm;

        @JsonProperty("num_leaves")
        private Double numLeaves;

        @JsonProperty("ns_policy")
        private String nsPolicy;

        @JsonProperty("ec_limit")
        private Double ecLimit;

        @JsonProperty("ns_new_per_plant_l")
        private Double nsNewPerPlantL;

        @JsonProperty("ns_added_per_plant_l")
        private Double nsAddedPerPlantL;

        @JsonProperty("ns_residual_per_plant_l")
        private Double nsResidualPerPlantL;

        @JsonProperty("ns_action")
        private String nsAction;

        @JsonProperty("ns_recommendation")
        private String nsRecommendation;

        private String source;

        public Integer getDaysAfterTransplant() {
            return daysAfterTransplant;
        }

        public void setDaysAfterTransplant(final Integer daysAfterTransplant) {
            this.daysAfterTransplant = daysAfterTransplant;
        }

        public Double getPlantHeightCm() {
            return plantHeightCm;
        }

        public void setPlantHeightCm(final Double plantHeightCm) {
            this.plantHeightCm = plantHeightCm;
        }

        public Double getNumLeaves() {
            return numLeaves;
        }

        public void setNumLeaves(final Double numLeaves) {
            this.numLeaves = numLeaves;
        }

        public String getNsPolicy() {
            return nsPolicy;
        }

        public void setNsPolicy(final String nsPolicy) {
            this.nsPolicy = nsPolicy;
        }

        public Double getEcLimit() {
            return ecLimit;
        }

        public void setEcLimit(final Double ecLimit) {
            this.ecLimit = ecLimit;
        }

        public Double getNsNewPerPlantL() {
            return nsNewPerPlantL;
        }

        public void setNsNewPerPlantL(final Double nsNewPerPlantL) {
            this.nsNewPerPlantL = nsNewPerPlantL;
        }

        public Double getNsAddedPerPlantL() {
            return nsAddedPerPlantL;
        }

        public void setNsAddedPerPlantL(final Double nsAddedPerPlantL) {
            this.nsAddedPerPlantL = nsAddedPerPlantL;
        }

        public Double getNsResidualPerPlantL() {
            return nsResidualPerPlantL;
        }

        public void setNsResidualPerPlantL(final Double nsResidualPerPlantL) {
            this.nsResidualPerPlantL = nsResidualPerPlantL;
        }

        public String getNsAction() {
            return nsAction;
        }

        public void setNsAction(final String nsAction) {
            this.nsAction = nsAction;
        }

        public String getNsRecommendation() {
            return nsRecommendation;
        }

        public void setNsRecommendation(final String nsRecommendation) {
            this.nsRecommendation = nsRecommendation;
        }

        public String getSource() {
            return source;
        }

        public void setSource(final String source) {
            this.source = source;
        }
    }
}
