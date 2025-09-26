package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String allowedOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
        if (allowedOrigins == null || allowedOrigins.equals("*")) {
            // For development or when not configured
            registry.addEndpoint("/ws")
                    .setAllowedOriginPatterns("*")
                    .withSockJS();
        } else {
            // For production with specific origins
            registry.addEndpoint("/ws")
                    .setAllowedOrigins(allowedOrigins.split(","))
                    .withSockJS();
        }
    }
}
