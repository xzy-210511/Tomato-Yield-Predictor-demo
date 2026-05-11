package com.example.demo.records;

import jakarta.validation.constraints.Size;

public class UpdateRecordRequest {

    @Size(max = 100)
    private String recordName;

    public String getRecordName() {
        return recordName;
    }

    public void setRecordName(final String recordName) {
        this.recordName = recordName;
    }
}
