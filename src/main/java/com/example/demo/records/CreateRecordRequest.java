package com.example.demo.records;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateRecordRequest {

    @NotNull
    private Long userId;

    @Size(max = 100)
    private String recordName;

    @NotBlank
    @Size(max = 50)
    private String recordType;

    @NotNull
    private JsonNode input;

    @NotNull
    private JsonNode output;

    private Double summaryValue;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(final Long userId) {
        this.userId = userId;
    }

    public String getRecordName() {
        return recordName;
    }

    public void setRecordName(final String recordName) {
        this.recordName = recordName;
    }

    public String getRecordType() {
        return recordType;
    }

    public void setRecordType(final String recordType) {
        this.recordType = recordType;
    }

    public JsonNode getInput() {
        return input;
    }

    public void setInput(final JsonNode input) {
        this.input = input;
    }

    public JsonNode getOutput() {
        return output;
    }

    public void setOutput(final JsonNode output) {
        this.output = output;
    }

    public Double getSummaryValue() {
        return summaryValue;
    }

    public void setSummaryValue(final Double summaryValue) {
        this.summaryValue = summaryValue;
    }
}
