package com.example.demo.prediction;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/predict")
public class PredictionController {

    private final PredictionService predictionService;

    public PredictionController(final PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @PostMapping
    public PredictionResponse predict(@RequestBody @Valid final PredictionRequest request) {
        return predictionService.predict(request);
    }

    @PostMapping("/timeseries")
    public TimeSeriesPredictionResponse predictTimeSeries(
            @RequestBody @Valid final TimeSeriesPredictionRequest request) {
        return predictionService.predictTimeSeries(request);
    }

    @PostMapping("/integrated")
    public Map<String, Object> predictIntegrated(
            @RequestBody @Valid final IntegratedPredictionRequest request) {
        return predictionService.predictIntegrated(request);
    }

}
