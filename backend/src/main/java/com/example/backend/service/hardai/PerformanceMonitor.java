package com.example.backend.service.hardai;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Tracks Hard AI performance metrics (HardAIImprovements.md section 8.2).
 */
@Component
public class PerformanceMonitor {

    private final List<Double> winRateSamples = new ArrayList<>();
    private final List<Double> bluffSuccessSamples = new ArrayList<>();
    private final List<Double> doubtAccuracySamples = new ArrayList<>();
    private final Deque<Double> recentPerformance = new ArrayDeque<>();

    private int gamesPlayed;
    private int gamesWon;
    private int bluffsAttempted;
    private int bluffsSucceeded;
    private int doubtsMade;
    private int doubtsCorrect;

    public synchronized void recordGame(boolean won) {
        gamesPlayed++;
        if (won) {
            gamesWon++;
        }
        double rate = gamesPlayed == 0 ? 0 : (double) gamesWon / gamesPlayed;
        winRateSamples.add(rate);
        recentPerformance.addLast(won ? 1.0 : 0.0);
        while (recentPerformance.size() > 10) {
            recentPerformance.removeFirst();
        }
    }

    public synchronized void recordBluff(boolean succeeded) {
        bluffsAttempted++;
        if (succeeded) {
            bluffsSucceeded++;
        }
        bluffSuccessSamples.add(bluffsAttempted == 0 ? 0 : (double) bluffsSucceeded / bluffsAttempted);
    }

    public synchronized void recordDoubt(boolean correct) {
        doubtsMade++;
        if (correct) {
            doubtsCorrect++;
        }
        doubtAccuracySamples.add(doubtsMade == 0 ? 0 : (double) doubtsCorrect / doubtsMade);
    }

    public synchronized double winRate() {
        return gamesPlayed == 0 ? 0 : (double) gamesWon / gamesPlayed;
    }

    public synchronized double bluffSuccessRate() {
        return bluffsAttempted == 0 ? 0 : (double) bluffsSucceeded / bluffsAttempted;
    }

    public synchronized double doubtAccuracy() {
        return doubtsMade == 0 ? 0 : (double) doubtsCorrect / doubtsMade;
    }

    public synchronized double recentForm() {
        if (recentPerformance.isEmpty()) {
            return 0.5;
        }
        double sum = 0;
        for (double v : recentPerformance) {
            sum += v;
        }
        return sum / recentPerformance.size();
    }

    /**
     * Rough exploitability proxy: how often humans beat us recently vs 50% baseline.
     * Lower is better.
     */
    public synchronized double exploitabilityScore() {
        double form = recentForm();
        // If humans win a lot (our form low), exploitability is high
        return Math.max(0, Math.min(1, 0.5 - form + 0.5));
    }

    public synchronized String summary() {
        return String.format(
                "games=%d winRate=%.1f%% bluffSuccess=%.1f%% doubtAcc=%.1f%% recent=%.1f%% exploit=%.2f",
                gamesPlayed, winRate() * 100, bluffSuccessRate() * 100, doubtAccuracy() * 100,
                recentForm() * 100, exploitabilityScore());
    }
}
