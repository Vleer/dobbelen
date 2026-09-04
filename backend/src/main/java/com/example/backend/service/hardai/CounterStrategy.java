package com.example.backend.service.hardai;

/**
 * Counter-strategy thresholds for a classified opponent archetype.
 */
public record CounterStrategy(
        double doubtThreshold,
        double bluffFrequency,
        double spotOnThreshold,
        StrategyType preferredStyle) {
}
