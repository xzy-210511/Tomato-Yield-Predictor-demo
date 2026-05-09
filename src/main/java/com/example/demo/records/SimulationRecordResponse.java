package com.example.demo.records;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

public class SimulationRecordResponse {

    private final Long id;
    private final Long userId;
    private final String recordName;
    private final String recordType;
    private final JsonNode input;
    private final JsonNode output;
    private final Double summaryValue;
    private final LocalDateTime createdAt;

    public SimulationRecordResponse(
            final SimulationRecord record,
            final JsonNode input,
            final JsonNode output) {
        this.id = record.getId();
        this.userId = record.getUserId();
        this.recordName = record.getRecordName();
        this.recordType = record.getRecordType();
        this.input = input;
        this.output = output;
        this.summaryValue = record.getSummaryValue();
        this.createdAt = record.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getRecordName() {
        return recordName;
    }

    public String getRecordType() {
        return recordType;
    }

    public JsonNode getInput() {
        return input;
    }

    public JsonNode getOutput() {
        return output;
    }

    public Double getSummaryValue() {
        return summaryValue;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
