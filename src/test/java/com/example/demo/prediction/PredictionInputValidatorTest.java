package com.example.demo.prediction;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;


class PredictionInputValidatorTest {

    private final PredictionInputValidator validator = new PredictionInputValidator();

    @Test
    void shouldRejectTooLowPh() {
        final PredictionRequest request = createValidRequest();
        request.setPH(4.5);

        final IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> validator.validate(request)
        );

        assertEquals(
                "pH is too low and may prevent the plant from surviving. Recommended range: 5 - 8.",
                exception.getMessage()
        );
    }

    @Test
    void shouldRejectInvalidTemperatureOrder() {
        final PredictionRequest request = createValidRequest();
        request.setMinTemperatureC(28.0);
        request.setAvgTemperatureC(25.0);

        final IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> validator.validate(request)
        );

        assertEquals("Minimum temperature cannot be higher than average temperature.", exception.getMessage());
    }

    @Test
    void shouldAllowValuesInsideSurvivalRange() {
        assertDoesNotThrow(() -> validator.validate(createValidRequest()));
    }

    private PredictionRequest createValidRequest() {
        final PredictionRequest request = new PredictionRequest();
        request.setAvgTemperatureC(25.0);
        request.setMinTemperatureC(22.0);
        request.setMaxTemperatureC(28.0);
        request.setHumidityPercent(70.0);
        request.setCo2Ppm(800.0);
        request.setLightIntensityLux(30000.0);
        request.setPhotoperiodHours(12.0);
        request.setIrrigationMm(7.0);
        request.setFertilizerNKgHa(170.0);
        request.setFertilizerPKgHa(80.0);
        request.setFertilizerKKgHa(180.0);
        request.setPestSeverity(1.0);
        request.setPH(6.5);
        request.setVariety("Roma");
        return request;
    }
}
