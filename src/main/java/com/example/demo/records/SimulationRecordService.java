package com.example.demo.records;

import com.example.demo.auth.AppUserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SimulationRecordService {

    private final SimulationRecordRepository simulationRecordRepository;
    private final AppUserRepository appUserRepository;
    private final ObjectMapper objectMapper;

    public SimulationRecordService(
            final SimulationRecordRepository simulationRecordRepository,
            final AppUserRepository appUserRepository,
            final ObjectMapper objectMapper) {
        this.simulationRecordRepository = simulationRecordRepository;
        this.appUserRepository = appUserRepository;
        this.objectMapper = objectMapper;
    }

    public SimulationRecordResponse createRecord(final CreateRecordRequest request) {
        ensureUserExists(request.getUserId());

        final SimulationRecord record = new SimulationRecord();
        record.setUserId(request.getUserId());
        record.setRecordName(normalizeRecordName(request.getRecordName()));
        record.setRecordType(request.getRecordType().trim());
        record.setInputJson(writeJson(request.getInput()));
        record.setOutputJson(writeJson(request.getOutput()));
        record.setSummaryValue(request.getSummaryValue());

        return toResponse(simulationRecordRepository.save(record));
    }

    public List<SimulationRecordResponse> listRecords(final Long userId) {
        ensureUserExists(userId);
        return simulationRecordRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public SimulationRecordResponse updateRecord(
            final Long recordId,
            final Long userId,
            final UpdateRecordRequest request) {
        ensureUserExists(userId);
        final SimulationRecord record = findOwnedRecord(recordId, userId);
        record.setRecordName(normalizeRecordName(request.getRecordName()));
        return toResponse(simulationRecordRepository.save(record));
    }

    public void deleteRecord(final Long recordId, final Long userId) {
        ensureUserExists(userId);
        final SimulationRecord record = findOwnedRecord(recordId, userId);
        simulationRecordRepository.delete(record);
    }

    private void ensureUserExists(final Long userId) {
        if (userId == null || !appUserRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
    }

    private SimulationRecord findOwnedRecord(final Long recordId, final Long userId) {
        return simulationRecordRepository.findByIdAndUserId(recordId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Record not found"
                ));
    }

    private String normalizeRecordName(final String recordName) {
        if (recordName == null || recordName.trim().isEmpty()) {
            return null;
        }
        return recordName.trim();
    }

    private String writeJson(final JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (final JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON payload", e);
        }
    }

    private JsonNode readJson(final String json) {
        try {
            return objectMapper.readTree(json);
        } catch (final JsonProcessingException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Stored record JSON is invalid",
                    e
            );
        }
    }

    private SimulationRecordResponse toResponse(final SimulationRecord record) {
        return new SimulationRecordResponse(
                record,
                readJson(record.getInputJson()),
                readJson(record.getOutputJson())
        );
    }
}
