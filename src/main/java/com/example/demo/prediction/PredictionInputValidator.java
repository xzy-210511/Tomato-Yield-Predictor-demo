package com.example.demo.prediction;

import java.util.List;
import java.util.function.Function;
import org.springframework.stereotype.Component;


@Component
public class PredictionInputValidator {

    private static final List<RangeRule> SURVIVAL_RULES = List.of(
            new RangeRule("Average temperature", "C", 18.0, 32.0, PredictionRequest::getAvgTemperatureC),
            new RangeRule("Minimum temperature", "C", 14.0, 30.0, PredictionRequest::getMinTemperatureC),
            new RangeRule("Maximum temperature", "C", 20.0, 35.0, PredictionRequest::getMaxTemperatureC),
            new RangeRule("Humidity", "%", 50.0, 99.0, PredictionRequest::getHumidityPercent),
            new RangeRule("CO2 concentration", "ppm", 350.0, 1200.0, PredictionRequest::getCo2Ppm),
            new RangeRule("Light intensity", "lux", 5000.0, 57000.0, PredictionRequest::getLightIntensityLux),
            new RangeRule("Photoperiod", "hours", 10.0, 16.5, PredictionRequest::getPhotoperiodHours),
            new RangeRule("Irrigation", "mm", 1.5, 13.5, PredictionRequest::getIrrigationMm),
            new RangeRule("Fertilizer N", "kg/ha", 140.0, 255.0, PredictionRequest::getFertilizerNKgHa),
            new RangeRule("Fertilizer P", "kg/ha", 45.0, 125.0, PredictionRequest::getFertilizerPKgHa),
            new RangeRule("Fertilizer K", "kg/ha", 140.0, 255.0, PredictionRequest::getFertilizerKKgHa),
            new RangeRule("Pest severity", "", 0.0, 5.0, PredictionRequest::getPestSeverity),
            new RangeRule("pH", "", 5.0, 8.0, PredictionRequest::getPH)
    );

    public void validate(final PredictionRequest request) {
        validateTemperatureOrder(request);
        for (final RangeRule rule : SURVIVAL_RULES) {
            rule.validate(request);
        }
    }

    private void validateTemperatureOrder(final PredictionRequest request) {
        if (request.getMinTemperatureC() > request.getAvgTemperatureC()) {
            throw new IllegalArgumentException("Minimum temperature cannot be higher than average temperature.");
        }
        if (request.getAvgTemperatureC() > request.getMaxTemperatureC()) {
            throw new IllegalArgumentException("Average temperature cannot be higher than maximum temperature.");
        }
    }

    private record RangeRule(
            String label,
            String unit,
            double min,
            double max,
            Function<PredictionRequest, Double> extractor) {

        private void validate(final PredictionRequest request) {
            final double value = extractor.apply(request);
            if (value < min) {
                throw new IllegalArgumentException(
                        label + " is too low and may prevent the plant from surviving. Recommended range: "
                                + formatRange()
                );
            }
            if (value > max) {
                throw new IllegalArgumentException(
                        label + " is too high and may prevent the plant from surviving. Recommended range: "
                                + formatRange()
                );
            }
        }

        private String formatRange() {
            final String suffix = unit.isBlank() ? "" : " " + unit;
            return formatNumber(min) + " - " + formatNumber(max) + suffix + ".";
        }

        private String formatNumber(final double value) {
            if (value == Math.rint(value)) {
                return String.valueOf((long) value);
            }
            return String.valueOf(value);
        }
    }
}
