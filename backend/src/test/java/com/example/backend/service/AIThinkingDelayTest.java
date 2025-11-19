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
    void testFirstTurnDelayIsConsistentlyLonger() {
        EasyAIService easyService = new EasyAIService();
        MediumAIService mediumService = new MediumAIService();
        
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
        }
    }
}
