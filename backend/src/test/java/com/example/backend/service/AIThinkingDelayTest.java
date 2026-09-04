package com.example.backend.service;

import com.example.backend.service.hardai.AdaptiveDecisionEngine;
import com.example.backend.service.hardai.HardAIHistoryStore;
import com.example.backend.service.hardai.MixedStrategy;
import com.example.backend.service.hardai.OpponentClusterer;
import com.example.backend.service.hardai.OpponentProfiler;
import com.example.backend.service.hardai.PatternBreaker;
import com.example.backend.service.hardai.PatternRecognizer;
import com.example.backend.service.hardai.PerformanceMonitor;
import com.example.backend.service.hardai.SimpleMLModel;
import com.example.backend.service.hardai.StrategySelector;
import com.example.backend.service.hardai.ThresholdAdapter;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AIThinkingDelayTest {

    private HardAIService createHardAI() {
        OpponentProfiler profiler = new OpponentProfiler();
        HardAIHistoryStore history = new HardAIHistoryStore();
        PerformanceMonitor monitor = new PerformanceMonitor();
        SimpleMLModel ml = new SimpleMLModel();
        StrategySelector selector = new StrategySelector();
        AdaptiveDecisionEngine engine = new AdaptiveDecisionEngine(
                profiler, new OpponentClusterer(), new ThresholdAdapter(), new MixedStrategy(),
                new PatternBreaker(), ml, selector, new PatternRecognizer(history), monitor);
        return new HardAIService(engine, profiler, history, monitor, ml, selector);
    }

    @Test
    void testEasyAIFirstTurnDelay() {
        EasyAIService service = new EasyAIService();
        
        long firstTurnDelay = service.getThinkingDelay(true);
        assertTrue(firstTurnDelay >= 5500 && firstTurnDelay <= 6500, 
            "First turn delay should be between 5.5 and 6.5 seconds, got: " + firstTurnDelay);
        
        long normalDelay = service.getThinkingDelay(false);
        assertTrue(normalDelay >= 500 && normalDelay <= 1500, 
            "Normal turn delay should be between 0.5 and 1.5 seconds, got: " + normalDelay);
    }

    @Test
    void testMediumAIFirstTurnDelay() {
        MediumAIService service = new MediumAIService();
        
        long firstTurnDelay = service.getThinkingDelay(true);
        assertTrue(firstTurnDelay >= 5500 && firstTurnDelay <= 6500, 
            "First turn delay should be between 5.5 and 6.5 seconds, got: " + firstTurnDelay);
        
        long normalDelay = service.getThinkingDelay(false);
        assertTrue(normalDelay >= 500 && normalDelay <= 1500, 
            "Normal turn delay should be between 0.5 and 1.5 seconds, got: " + normalDelay);
    }

    @Test
    void testHardAIThinkingDelayCappedAt10Seconds() {
        HardAIService service = createHardAI();

        for (int i = 0; i < 20; i++) {
            long firstTurnDelay = service.getThinkingDelay(true);
            long normalDelay = service.getThinkingDelay(false);

            assertTrue(firstTurnDelay <= 10_000,
                "Hard AI first turn must not exceed 10s, got: " + firstTurnDelay);
            assertTrue(normalDelay <= 10_000,
                "Hard AI normal turn must not exceed 10s, got: " + normalDelay);
            assertTrue(firstTurnDelay >= 6500 && firstTurnDelay <= 8500,
                "Hard AI first turn expected 6.5–8.5s, got: " + firstTurnDelay);
            assertTrue(normalDelay >= 1500 && normalDelay <= 3500,
                "Hard AI normal turn expected 1.5–3.5s, got: " + normalDelay);
            assertTrue(firstTurnDelay > normalDelay,
                "First turn delay should be longer than normal turn delay");
        }
    }
    
    @Test
    void testFirstTurnDelayIsConsistentlyLonger() {
        EasyAIService easyService = new EasyAIService();
        MediumAIService mediumService = new MediumAIService();
        HardAIService hardService = createHardAI();
        
        for (int i = 0; i < 10; i++) {
            assertTrue(easyService.getThinkingDelay(true) > easyService.getThinkingDelay(false));
            assertTrue(mediumService.getThinkingDelay(true) > mediumService.getThinkingDelay(false));
            long hardFirst = hardService.getThinkingDelay(true);
            long hardNormal = hardService.getThinkingDelay(false);
            assertTrue(hardFirst > hardNormal);
            assertTrue(hardFirst <= 10_000 && hardNormal <= 10_000);
        }
    }
}
