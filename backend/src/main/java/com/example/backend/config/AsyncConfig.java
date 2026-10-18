package com.example.backend.config;

import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Shared executors for delayed game work.
 *
 * <p>The service previously created a bare {@code new java.util.Timer()} per delayed task and a bare
 * {@code new Thread(...)} per AI turn. Each of those starts a brand-new non-daemon OS thread that is
 * never cancelled or joined, so a long-running server leaked two threads per round and one thread
 * per AI move until the JVM ran out of thread slots. These beans give the whole application a small,
 * bounded set of daemon threads that the container can shut down cleanly.
 *
 * <p>Both pools are injected into services by explicit bean name: {@code ScheduledThreadPoolExecutor}
 * is itself a {@code ThreadPoolExecutor}, so relying on type-based injection would be ambiguous.
 */
@Configuration
public class AsyncConfig {

    /** Daemon threads so a stuck task can never keep the JVM alive on shutdown. */
    private static ThreadFactory daemonThreadFactory(String prefix) {
        AtomicInteger counter = new AtomicInteger();
        return runnable -> {
            Thread thread = new Thread(runnable, prefix + "-" + counter.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }

    /**
     * Runs the one-shot delayed game tasks (countdown to start, reveal delays, auto-continue,
     * next-round scheduling). Small pool because these only fire on game-state transitions.
     */
    @Bean(name = "gameTaskScheduler", destroyMethod = "shutdownNow")
    public ScheduledThreadPoolExecutor gameTaskScheduler() {
        ScheduledThreadPoolExecutor scheduler = new ScheduledThreadPoolExecutor(
                2, daemonThreadFactory("game-scheduler"));
        // Drop cancelled tasks from the queue instead of holding them until their due time.
        scheduler.setRemoveOnCancelPolicy(true);
        scheduler.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
        return scheduler;
    }

    /**
     * Runs AI turns. Bounded on purpose: an AI turn sleeps for a "thinking" delay, so an unbounded
     * pool would still be able to grow without limit under load. The queue is bounded too, and a
     * saturated executor drops the task instead of blocking the {@code @Scheduled} AI scan.
     */
    @Bean(name = "aiTurnExecutor", destroyMethod = "shutdownNow")
    public ThreadPoolExecutor aiTurnExecutor() {
        RejectedExecutionHandler drop = new ThreadPoolExecutor.DiscardPolicy();
        return new ThreadPoolExecutor(4, 32, 60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(512),
                daemonThreadFactory("ai-turn"),
                drop);
    }
}