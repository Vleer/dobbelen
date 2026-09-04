package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Detects and breaks predictable action sequences (section 4.2).
 */
@Component
public class PatternBreaker {

    private final List<String> lastActions = new ArrayList<>();
    private static final int WINDOW = 5;
    private static final int MAX_HISTORY = 50;

    public void record(String action) {
        if (action == null) {
            return;
        }
        String normalized = normalize(action);
        lastActions.add(normalized);
        while (lastActions.size() > MAX_HISTORY) {
            lastActions.remove(0);
        }
    }

    public boolean detectPatterns() {
        if (lastActions.size() < WINDOW) {
            return false;
        }
        List<String> recent = lastActions.subList(lastActions.size() - WINDOW, lastActions.size());
        Set<String> unique = new HashSet<>(recent);
        return unique.size() <= 2;
    }

    /**
     * Occasionally force a different action type when the AI has become predictable.
     * Returns null if no break is needed / possible.
     */
    public String maybeBreak(String intendedAction, boolean canRaise, boolean canDoubt,
            boolean canSpotOn) {
        if (!detectPatterns()) {
            return null;
        }
        // Only break ~50% of the time when a pattern is detected
        if (ThreadLocalRandom.current().nextDouble() > 0.5) {
            return null;
        }

        String intended = normalize(intendedAction);
        List<String> alternatives = new ArrayList<>();
        if (canRaise && !"bid".equals(intended)) {
            alternatives.add("bid");
        }
        if (canDoubt && !"doubt".equals(intended)) {
            alternatives.add("doubt");
        }
        if (canSpotOn && !"spotOn".equals(intended)) {
            alternatives.add("spotOn");
        }
        if (alternatives.isEmpty()) {
            return null;
        }
        return alternatives.get(ThreadLocalRandom.current().nextInt(alternatives.size()));
    }

    private static String normalize(String action) {
        if (action == null) {
            return "";
        }
        return switch (action.toLowerCase()) {
            case "raise", "bid" -> "bid";
            case "doubt" -> "doubt";
            case "spot_on", "spoton", "spot-on" -> "spotOn";
            default -> action;
        };
    }

    public List<String> getLastActions() {
        return List.copyOf(lastActions);
    }

    public void clear() {
        lastActions.clear();
    }
}
