package com.example.demo.records;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/records")
public class SimulationRecordController {

    private final SimulationRecordService simulationRecordService;

    public SimulationRecordController(final SimulationRecordService simulationRecordService) {
        this.simulationRecordService = simulationRecordService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SimulationRecordResponse createRecord(
            @RequestBody @Valid final CreateRecordRequest request) {
        return simulationRecordService.createRecord(request);
    }

    @GetMapping
    public List<SimulationRecordResponse> listRecords(@RequestParam final Long userId) {
        return simulationRecordService.listRecords(userId);
    }

    @PatchMapping("/{id}")
    public SimulationRecordResponse updateRecord(
            @PathVariable final Long id,
            @RequestParam final Long userId,
            @RequestBody @Valid final UpdateRecordRequest request) {
        return simulationRecordService.updateRecord(id, userId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecord(
            @PathVariable final Long id,
            @RequestParam final Long userId) {
        simulationRecordService.deleteRecord(id, userId);
    }
}
