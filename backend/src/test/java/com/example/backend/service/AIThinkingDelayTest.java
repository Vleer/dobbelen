package com.example.backend.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AIThinkingDelayTest {

    @Test
    void testEasyAIFirstTurnDelay() {
        EasyAIService service = new EasyAIService();
        
        // Test first turn delay
        long firstTurnDelay = service.getThinkingDelay(true);
        assertTrue(firstTurnDelay >= 5500 && firstTurnDelay <= 6500, 
            "First turn delay should be between 5.5 and 6.5 seconds, got: " + firstTurnDelay);
        
        // Test normal turn delay
        long normalDelay = service.getThinkingDelay(false);
        assertTrue(normalDelay >= 500 && normalDelay <= 1500, 
            "Normal turn delay should be between 0.5 and 1.5 seconds, got: " + normalDelay);
    }

    @Test
    void testMediumAIFirstTurnDelay() {
        MediumAIService service = new MediumAIService();
        
        // Test first turn delay
        long firstTurnDelay = service.getThinkingDelay(true);
        assertTrue(firstTurnDelay >= 5500 && firstTurnDelay <= 6500, 
            "First turn delay should be between 5.5 and 6.5 seconds, got: " + firstTurnDelay);
        
        // Test normal turn delay
        long normalDelay = service.getThinkingDelay(false);
        assertTrue(normalDelay >= 500 && normalDelay <= 1500, 
            "Normal turn delay should be between 0.5 and 1.5 seconds, got: " + normalDelay);
    }

    @Test
    void testHardAIThinkingDelayCappedAt10Seconds() {
        HardAIService service = new HardAIService();

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
        HardAIService hardService = new HardAIService();
        
        // Test multiple times to ensure consistency
        for (int i = 0; i < 10; i++) {
            long easyFirstTurn = easyService.getThinkingDelay(true);
            long easyNormalTurn = easyService.getThinkingDelay(false);
            
            assertTrue(easyFirstTurn > easyNormalTurn, 
                "First turn delay should always be longer than normal turn delay");
            
            long mediumFirstTurn = mediumService.getThinkingDelay(true);
            long mediumNormalTurn = mediumService.getThinkingDelay(false);
            
            assertTrue(mediumFirstTurn > mediumNormalTurn, 
                "First turn delay should always be longer than normal turn delay");

            long hardFirstTurn = hardService.getThinkingDelay(true);
            long hardNormalTurn = hardService.getThinkingDelay(false);

            assertTrue(hardFirstTurn > hardNormalTurn,
                "Hard AI first turn delay should always be longer than normal turn delay");
            assertTrue(hardFirstTurn <= 10_000 && hardNormalTurn <= 10_000);
        }
    }
}
