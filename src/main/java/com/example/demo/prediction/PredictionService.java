package com.example.demo.prediction;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;


@Service
public class PredictionService {

    private final RestClient restClient;

    public PredictionService(@Value("${python.api.base-url}") final String pythonApiBaseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(pythonApiBaseUrl)
                .build();
    }

    public PredictionResponse predict(final PredictionRequest request) {
        final Map<String, Object> pythonPayload = new LinkedHashMap<>();
        pythonPayload.put("avg_temperature_C", request.getAvgTemperatureC());
        pythonPayload.put("min_temperature_C", request.getMinTemperatureC());
        pythonPayload.put("max_temperature_C", request.getMaxTemperatureC());
        pythonPayload.put("humidity_percent", request.getHumidityPercent());
        pythonPayload.put("co2_ppm", request.getCo2Ppm());
        pythonPayload.put("light_intensity_lux", request.getLightIntensityLux());
        pythonPayload.put("photoperiod_hours", request.getPhotoperiodHours());
        pythonPayload.put("irrigation_mm", request.getIrrigationMm());
        pythonPayload.put("fertilizer_N_kg_ha", request.getFertilizerNKgHa());
        pythonPayload.put("fertilizer_P_kg_ha", request.getFertilizerPKgHa());
        pythonPayload.put("fertilizer_K_kg_ha", request.getFertilizerKKgHa());
        pythonPayload.put("pest_severity", request.getPestSeverity());
        pythonPayload.put("pH", request.getPH());
        pythonPayload.put("variety", request.getVariety());
        return restClient.post()
                .uri("/predict")
                .contentType(MediaType.APPLICATION_JSON)
                .body(pythonPayload)
                .retrieve()
                .body(PredictionResponse.class);
    }

}
