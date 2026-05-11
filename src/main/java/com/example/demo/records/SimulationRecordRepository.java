package com.example.demo.records;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRecordRepository extends JpaRepository<SimulationRecord, Long> {

    List<SimulationRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<SimulationRecord> findByIdAndUserId(Long id, Long userId);
}
