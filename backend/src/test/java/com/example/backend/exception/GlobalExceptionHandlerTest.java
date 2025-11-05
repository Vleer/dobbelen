package com.example.backend.exception;

import com.example.backend.controller.GameController;
import com.example.backend.service.GameService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GameController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GameService gameService;

    @Test
    void testGameNotFoundException() throws Exception {
        when(gameService.getGame(anyString())).thenThrow(new GameNotFoundException("Game not found: test-id"));

        mockMvc.perform(get("/api/games/test-id"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Game not found: test-id"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void testInvalidGameStateException() throws Exception {
        when(gameService.getGame(anyString())).thenThrow(new InvalidGameStateException("Game is not in progress"));

        mockMvc.perform(get("/api/games/test-id"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Game is not in progress"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void testInvalidPlayerActionException() throws Exception {
        when(gameService.getGame(anyString())).thenThrow(new InvalidPlayerActionException("Player is eliminated"));

        mockMvc.perform(get("/api/games/test-id"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Player is eliminated"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
