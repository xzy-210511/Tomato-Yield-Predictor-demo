package com.example.demo.prediction;

import org.springframework.data.jpa.repository.JpaRepository;


public interface PredictionRecordRepository extends JpaRepository<PredictionRecord, Long> {
}
