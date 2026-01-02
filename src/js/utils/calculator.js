// Calculator Utilities - Performance testing formulas

/**
 * Extended Little's Law for Web Applications
 * U = TPS × (Total RT + Total TT + Pacing)
 * TPS = Transactions (iterations) per second
 */
export function calculateVirtualUsers(tps, totalRT, totalTT, pacing = 0) {
    const iterationTime = totalRT + totalTT + pacing;
    
    const vus = tps * iterationTime;
    
    return {
        vus: vus,
        totalResponseTime: totalRT,
        totalThinkTime: totalTT,
        iterationTime: iterationTime,
        breakdown: `${tps} × (${totalRT.toFixed(2)} + ${totalTT.toFixed(2)} + ${pacing}) = ${vus.toFixed(2)}`
    };
}

/**
 * Calculate required pacing
 * Pacing = (Users / TPS) - Total RT - Total TT
 */
export function calculatePacing(users, tps, totalRT, totalTT) {
    const pacing = (users / tps) - totalRT - totalTT;
    const calculatedPacing = Math.max(0, pacing);
    
    return {
        pacing: calculatedPacing,
        totalResponseTime: totalRT,
        totalThinkTime: totalTT,
        iterationTime: totalRT + totalTT + calculatedPacing,
        breakdown: `(${users} / ${tps}) - ${totalRT.toFixed(2)} - ${totalTT.toFixed(2)} = ${calculatedPacing.toFixed(2)}`
    };
}

/**
 * Calculate required TPS
 * TPS = Users / (Total RT + Total TT + Pacing)
 */
export function calculateTPS(users, totalRT, totalTT, pacing) {
    const iterationTime = totalRT + totalTT + pacing;
    
    const tps = users / iterationTime;
    
    return {
        tps: tps,
        totalResponseTime: totalRT,
        totalThinkTime: totalTT,
        iterationTime: iterationTime,
        breakdown: `${users} / (${totalRT.toFixed(2)} + ${totalTT.toFixed(2)} + ${pacing}) = ${tps.toFixed(2)}`
    };
}

/**
 * Calculate required think time per page
 */
export function calculateThinkTime(users, tps, numPages, responseTime, pacing) {
    const iterationsPerSecond = tps / numPages;
    const totalResponseTime = responseTime * numPages;
    
    const totalThinkTime = (users / iterationsPerSecond) - totalResponseTime - pacing;
    const thinkTimePerPage = totalThinkTime / (numPages - 1);
    
    return Math.max(0, thinkTimePerPage);
}

/**
 * Calculate concurrent users from business metrics
 * CU = (NSavg × SDavg) / 3600
 */
export function calculateConcurrentUsers(sessionsPerHour, avgSessionDuration) {
    return Math.ceil((sessionsPerHour * avgSessionDuration) / 3600);
}

/**
 * Calculate throughput (TPS)
 * X = N / T
 */
export function calculateThroughput(numRequests, totalTime) {
    return numRequests / totalTime;
}
