package com.example.backend.service.hardai;

/**
 * High-level strategy modes for Q-learning selection.
 */
public enum StrategyType {
    DOUBT_FOCUSED,
    RAISE_FOCUSED,
    BALANCED,
    EXPLOITATIVE,
    DEFENSIVE,
    AGGRESSIVE_BLUFF,
    /** Bid faces held 0–1 times to bait opponent into a bad doubt/raise. */
    TRAP_BLUFF,
    /** Climb slowly on a strong held face; punish overbids. */
    VALUE_SQUEEZE,
    /** Prefer switching face to stay unpredictable. */
    FACE_SWITCH,
    /** Keep raising to force opponent into overcommitment. */
    PRESSURE_RAISE,
    /** Ultra-tight play (especially endgame). */
    ENDGAME_TIGHT
}
