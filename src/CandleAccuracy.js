
// ----------------------------
// Takes an array of 5-minute candles from a stock and 
// aggregates the accuracy (immediate, daily, weekly) for each candle
// 
// * Candles array is expected to be orderd by candle.date desc
// ----------------------------


// Fill in aggregate accuracy of each candle for its trading day/week
function populateAccuracy(candles) {
    
    candles.forEach((candle) => {
        
        // Daily
        const dailyCandles = priorDailyCandles(candles, candle);
        const weeklyCandles = priorWeeklyCandles(candles, candle);
        const priorDailyCount = dailyCandles.length;
        const priorWeeklyCount = weeklyCandles.length;

        if (priorDailyCount > 0) {
            // Last Td
            let lastTdCandlesAccurate = dailyCandles.filter(x => Math.abs(x.estCloseLastTdAccuracy) <= 0.5).length;
            let lastTdCandlesAccurateNarrow = dailyCandles.filter(x => Math.abs(x.estCloseLastTdAccuracy) <= 0.25).length;
            
            let lastTdDailyAverage = (lastTdCandlesAccurate / priorDailyCount * 100).toFixed(1);
            let lastTdDailyNarrowAverage = (lastTdCandlesAccurateNarrow / priorDailyCount * 100).toFixed(1);

            candle.estCloseLastTdAccuracyDaily = lastTdDailyAverage + '%';
            candle.estCloseLastTdAccuracyDailyNarrow = `Narrow (0.25) accuracy: ${lastTdDailyNarrowAverage}%`;

            // Average (50-day)
            let averageCandlesAccurate = dailyCandles.filter(x => Math.abs(x.estCloseAverageAccuracy) <= 0.5).length;
            let averageCandlesAccurateNarrow = dailyCandles.filter(x => Math.abs(x.estCloseAverageAccuracy) <= 0.25).length;
            
            let averageDailyAverage = (averageCandlesAccurate / priorDailyCount * 100).toFixed(1);
            let averageDailyNarrowAverage = (averageCandlesAccurateNarrow / priorDailyCount * 100).toFixed(1);

            candle.estCloseAverageAccuracyDaily = averageDailyAverage + '%';
            candle.estCloseAverageAccuracyDailyNarrow = `Narrow (0.25) accuracy: ${averageDailyNarrowAverage}%`;

            // Day-of-week Average
            let dowAverageCandlesAccurate = dailyCandles.filter(x => Math.abs(x.estCloseDowAverageAccuracy) <= 0.5).length;
            let dowAverageCandlesAccurateNarrow = dailyCandles.filter(x => Math.abs(x.estCloseDowAverageAccuracy) <= 0.25).length;

            let dowAverageDailyDowAverage = (dowAverageCandlesAccurate / priorDailyCount * 100).toFixed(1);
            let dowAverageDailyNarrowDowAverage = (dowAverageCandlesAccurateNarrow / priorDailyCount * 100).toFixed(1);

            candle.estCloseDowAverageAccuracyDaily = dowAverageDailyDowAverage + '%';
            candle.estCloseDowAverageAccuracyDailyNarrow = `Narrow (0.25) accuracy: ${dowAverageDailyNarrowDowAverage}%`;

            
            // Overall Average
            let overallAverageCandlesAccurate = dailyCandles.filter(x => Math.abs(x.estCloseOverallAverageAccuracy) <= 0.5).length;
            let overallAverageCandlesAccurateNarrow = dailyCandles.filter(x => Math.abs(x.estCloseOverallAverageAccuracy) <= 0.25).length;

            let overallAverageDailyOverallAverage = (overallAverageCandlesAccurate / priorDailyCount * 100).toFixed(1);
            let overallAverageDailyNarrowOverallAverage = (overallAverageCandlesAccurateNarrow / priorDailyCount * 100).toFixed(1);

            candle.estCloseOverallAverageAccuracyDaily = overallAverageDailyOverallAverage + '%';
            candle.estCloseOverallAverageAccuracyDailyNarrow = `Narrow (0.25) accuracy: ${overallAverageDailyNarrowOverallAverage}%`;
        }

        
        if (priorWeeklyCount > 0) {
            // Last Td
            let lastTdCandlesAccurate = weeklyCandles.filter(x => Math.abs(x.estCloseLastTdAccuracy) <= 0.5).length;
            let lastTdCandlesAccurateNarrow = weeklyCandles.filter(x => Math.abs(x.estCloseLastTdAccuracy) <= 0.25).length;
            
            let lastTdWeeklyAverage = (lastTdCandlesAccurate / priorWeeklyCount * 100).toFixed(1);
            let lastTdWeeklyNarrowAverage = (lastTdCandlesAccurateNarrow / priorWeeklyCount * 100).toFixed(1);

            candle.estCloseLastTdAccuracyWeekly = lastTdWeeklyAverage + '%';
            candle.estCloseLastTdAccuracyWeeklyNarrow = `Narrow (0.25) accuracy: ${lastTdWeeklyNarrowAverage}%`;

            // Average (50-day)
            let averageCandlesAccurate = weeklyCandles.filter(x => Math.abs(x.estCloseAverageAccuracy) <= 0.5).length;
            let averageCandlesAccurateNarrow = weeklyCandles.filter(x => Math.abs(x.estCloseAverageAccuracy) <= 0.25).length;
            
            let averageWeeklyAverage = (averageCandlesAccurate / priorWeeklyCount * 100).toFixed(1);
            let averageWeeklyNarrowAverage = (averageCandlesAccurateNarrow / priorWeeklyCount * 100).toFixed(1);

            candle.estCloseAverageAccuracyWeekly = averageWeeklyAverage + '%';
            candle.estCloseAverageAccuracyWeeklyNarrow = `Narrow (0.25) accuracy: ${averageWeeklyNarrowAverage}%`;

            // Day-of-week Average
            let dowAverageCandlesAccurate = weeklyCandles.filter(x => Math.abs(x.estCloseDowAverageAccuracy) <= 0.5).length;
            let dowAverageCandlesAccurateNarrow = weeklyCandles.filter(x => Math.abs(x.estCloseDowAverageAccuracy) <= 0.25).length;
            
            let dowAverageWeeklyDowAverage = (dowAverageCandlesAccurate / priorWeeklyCount * 100).toFixed(1);
            let dowAverageWeeklyNarrowDowAverage = (dowAverageCandlesAccurateNarrow / priorWeeklyCount * 100).toFixed(1);

            candle.estCloseDowAverageAccuracyWeekly = dowAverageWeeklyDowAverage + '%';
            candle.estCloseDowAverageAccuracyWeeklyNarrow = `Narrow (0.25) accuracy: ${dowAverageWeeklyNarrowDowAverage}%`;
            
            // Overall average
            let overallAverageCandlesAccurate = weeklyCandles.filter(x => Math.abs(x.estCloseOverallAverageAccuracy) <= 0.5).length;
            let overallAverageCandlesAccurateNarrow = weeklyCandles.filter(x => Math.abs(x.estCloseOverallAverageAccuracy) <= 0.25).length;
            
            let overallAverageWeeklyOverallAverage = (overallAverageCandlesAccurate / priorWeeklyCount * 100).toFixed(1);
            let overallAverageWeeklyNarrowOverallAverage = (overallAverageCandlesAccurateNarrow / priorWeeklyCount * 100).toFixed(1);

            candle.estCloseOverallAverageAccuracyWeekly = overallAverageWeeklyOverallAverage + '%';
            candle.estCloseOverallAverageAccuracyWeeklyNarrow = `Narrow (0.25) accuracy: ${overallAverageWeeklyNarrowOverallAverage}%`;
        }
    });
}

// Get current candle, and all candles before it today
function priorDailyCandles(candles, candle) {
    return candles.filter(x => 
        x.dateString === candle.dateString && 
        x.candleIndex <= candle.candleIndex && 
        !x.futureCandle);
}

// Get current candle, and all candles before it this week
function priorWeeklyCandles(candles, candle) {
    return candles.filter(x => 
        x.weekNumber === candle.weekNumber && 
        x.candleIndex <= candle.candleIndex &&
        !x.futureCandle);
}


export {populateAccuracy};