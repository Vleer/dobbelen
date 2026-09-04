package com.example.backend.service.hardai;

/**
 * Shared binomial probability cache for Hard AI.
 */
public final class BinomialProbability {

    private static final int MAX_DICE = 40;
    private static final double[][] AT_LEAST = new double[MAX_DICE + 1][];
    private static final double[][] EXACT = new double[MAX_DICE + 1][];

    static {
        for (int n = 0; n <= MAX_DICE; n++) {
            AT_LEAST[n] = new double[n + 1];
            EXACT[n] = new double[n + 1];
            for (int k = 0; k <= n; k++) {
                EXACT[n][k] = binomialExact(n, k, 1.0 / 6.0);
            }
            AT_LEAST[n][n] = EXACT[n][n];
            for (int k = n - 1; k >= 0; k--) {
                AT_LEAST[n][k] = AT_LEAST[n][k + 1] + EXACT[n][k];
            }
        }
    }

    private BinomialProbability() {
    }

    public static double probabilityAtLeast(int targetQty, int myCount, int unknownDice) {
        int needed = targetQty - myCount;
        if (needed <= 0) {
            return 1.0;
        }
        if (needed > unknownDice) {
            return 0.0;
        }
        return cachedAtLeast(unknownDice, needed);
    }

    public static double probabilityExact(int targetQty, int myCount, int unknownDice) {
        int needed = targetQty - myCount;
        if (needed < 0 || needed > unknownDice) {
            return 0.0;
        }
        return cachedExact(unknownDice, needed);
    }

    public static double probabilityAtLeastUnconditional(int targetQty, int totalDice) {
        return probabilityAtLeast(targetQty, 0, totalDice);
    }

    private static double cachedAtLeast(int n, int k) {
        if (k <= 0) {
            return 1.0;
        }
        if (n < 0 || k > n) {
            return 0.0;
        }
        if (n <= MAX_DICE) {
            return AT_LEAST[n][k];
        }
        return binomialAtLeast(n, k, 1.0 / 6.0);
    }

    private static double cachedExact(int n, int k) {
        if (n < 0 || k < 0 || k > n) {
            return 0.0;
        }
        if (n <= MAX_DICE) {
            return EXACT[n][k];
        }
        return binomialExact(n, k, 1.0 / 6.0);
    }

    private static double binomialExact(int n, int k, double p) {
        if (k < 0 || k > n) {
            return 0.0;
        }
        double logProb = logBinomialCoeff(n, k) + k * Math.log(p) + (n - k) * Math.log(1.0 - p);
        return Math.exp(logProb);
    }

    private static double binomialAtLeast(int n, int k, double p) {
        double sum = 0.0;
        for (int i = k; i <= n; i++) {
            sum += binomialExact(n, i, p);
        }
        return Math.min(1.0, sum);
    }

    private static double logBinomialCoeff(int n, int k) {
        if (k < 0 || k > n) {
            return Double.NEGATIVE_INFINITY;
        }
        k = Math.min(k, n - k);
        double log = 0.0;
        for (int i = 1; i <= k; i++) {
            log += Math.log(n - k + i) - Math.log(i);
        }
        return log;
    }
}
