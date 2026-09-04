package com.example.backend.service.hardai;

/**
 * High-level strategy modes for Q-learning selection (section 5.3 / 7.2).
 */
public enum StrategyType {
    DOUBT_FOCUSED,
    RAISE_FOCUSED,
    BALANCED,
    EXPLOITATIVE,
    DEFENSIVE,
    AGGRESSIVE_BLUFF
}
