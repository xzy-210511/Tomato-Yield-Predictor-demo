package com.example.demo.records;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_records")
public class SimulationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "record_name", length = 100)
    private String recordName;

    @Column(name = "record_type", nullable = false, length = 50)
    private String recordType;

    @Column(name = "input_json", nullable = false, columnDefinition = "TEXT")
    private String inputJson;

    @Column(name = "output_json", nullable = false, columnDefinition = "TEXT")
    private String outputJson;

    @Column(name = "summary_value")
    private Double summaryValue;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

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

    public String getInputJson() {
        return inputJson;
    }

    public void setInputJson(final String inputJson) {
        this.inputJson = inputJson;
    }

    public String getOutputJson() {
        return outputJson;
    }

    public void setOutputJson(final String outputJson) {
        this.outputJson = outputJson;
    }

    public Double getSummaryValue() {
        return summaryValue;
    }

    public void setSummaryValue(final Double summaryValue) {
        this.summaryValue = summaryValue;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
