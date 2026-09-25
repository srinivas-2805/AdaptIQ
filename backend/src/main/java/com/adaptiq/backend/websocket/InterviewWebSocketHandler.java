package com.adaptiq.backend.websocket;

import com.adaptiq.backend.service.JsonUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InterviewWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(InterviewWebSocketHandler.class);
    private final JsonUtil jsonUtil;
    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>();

    public InterviewWebSocketHandler(JsonUtil jsonUtil) {
        this.jsonUtil = jsonUtil;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        activeSessions.put(session.getId(), session);
        log.info("WebSocket connected: session id={}", session.getId());
        sendSafe(session, Map.of("type", "CONNECTED", "connectionId", session.getId(), "message", "Real-time interview channel established"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            Map<String, Object> payload = jsonUtil.fromJson(message.getPayload(), Map.class);
            String type = (String) payload.getOrDefault("type", "PING");

            switch (type) {
                case "PING" -> sendSafe(session, Map.of("type", "PONG", "timestamp", System.currentTimeMillis()));
                case "WEBRTC_SIGNAL" -> {
                    // Forward or echo WebRTC signaling payload (offer/answer/candidate)
                    sendSafe(session, Map.of("type", "WEBRTC_ACK", "status", "SIGNAL_RECEIVED", "data", payload.get("data")));
                }
                case "TELEMETRY" -> {
                    // Real-time audio/vision telemetry heartbeat from candidate client
                    // e.g., current volume, speaking state, eye contact %
                    sendSafe(session, Map.of(
                            "type", "TELEMETRY_ACK",
                            "status", "RECORDED",
                            "timestamp", System.currentTimeMillis()
                    ));
                }
                default -> sendSafe(session, Map.of("type", "ECHO", "received", payload));
            }
        } catch (Exception e) {
            log.error("Failed to process WebSocket message", e);
            sendSafe(session, Map.of("type", "ERROR", "message", e.getMessage()));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        activeSessions.remove(session.getId());
        log.info("WebSocket disconnected: session id={}, status={}", session.getId(), status);
    }

    private void sendSafe(WebSocketSession session, Map<String, Object> data) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(jsonUtil.toJson(data)));
            }
        } catch (IOException e) {
            log.warn("Failed to send WebSocket message to {}", session.getId(), e);
        }
    }
}
