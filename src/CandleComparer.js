import moment from 'moment-timezone';
moment.tz.setDefault('America/New_York');

// ----------------------------
// Takes an array of 5-minute candles from a stock and applies
// various estimation strategies to each candle
// 
// * Candles array is expected to be orderd by candle.date desc
// ----------------------------



// Fill in candle estimates on various strategies
function populateEstimates(candles) {
    
    candles.forEach((candle, i) => {
        populateEstimatedCloseLastTd(candles, candle, i);
        populateEstimatedCloseAverage(candles, candle, i);
        populateEstimatedCloseDowAverage(candles, candle, i);
        populateOverallAverage(candle);
    });
    
    // console.time('testPerf');
    // console.timeEnd('testPerf');
}


// ----------------------------
// -- Estimation Strategies -- 
// ----------------------------

// Last Trading day strategy: 
// Compare the price increase (Open->Close) on the last trading day's candle with the same timeString
function populateEstimatedCloseLastTd(candles, candle, index) {

    const result = estimateCandlePrice(candles, candle, index, 1, false);
    if (result) {
        candle.estCloseLastTd = result.estimatedClose;
        candle.estCloseLastTdDetails = result.details;
        candle.estCloseLastTdAccuracy = result.estimatedCloseAccuracy;
        candle.estCloseLastTdClassName = result.estimatedCloseClass;
    }
}

// Averages strategy
// Compare the price increase (Open->Close) on the last 50 trading days 
function populateEstimatedCloseAverage(candles, candle, index) {

    const result = estimateCandlePrice(candles, candle, index, 50, false);
    if (result) {
        candle.estCloseAverage = result.estimatedClose;
        candle.estCloseAverageDetails = result.details;
        candle.estCloseAverageAccuracy = result.estimatedCloseAccuracy;
        candle.estCloseAverageClassName = result.estimatedCloseClass;
    }
}

// Averages Day-of-week strategy
// Compare the price increase (Open->Close) on the last 7 trading days that 
// are the same day of week (e.g. Tuesday)
function populateEstimatedCloseDowAverage(candles, candle, index) {

    const result = estimateCandlePrice(candles, candle, index, 50, true);
    if (result) {
        candle.estCloseDowAverage = result.estimatedClose;
        candle.estCloseDowAverageDetails = result.details;
        candle.estCloseDowAverageAccuracy = result.estimatedCloseAccuracy;
        candle.estCloseDowAverageClassName = result.estimatedCloseClass;
    }
}

// Averages the other strategies' estimates into one value
function populateOverallAverage(candle) {
    
    let total = 0;
    let count = 0;

    let estimatedClose = 0;
    let details = `${candle.timeString}`;
    let accuracy = 0;
    let estimatedCloseClass = '';

    // Average previous results
    if (candle.estCloseLastTd) {
        total += parseFloat(candle.estCloseLastTd);
        count++;
    }
    if (candle.estCloseAverage) {
        total += parseFloat(candle.estCloseAverage);
        count++;
    }
    if (candle.estCloseDowAverage) {
        total += parseFloat(candle.estCloseDowAverage);
        count++;
    }

    if (count > 0) {
        estimatedClose = parseFloat(total / count);
    }

    // Accuracy, if the candle has a close
    if (candle.close) {
        accuracy = ((candle.close - estimatedClose) * -1).toFixed(2);
        let absAccuracy = Math.abs(accuracy);

        if (absAccuracy <= 0.25) {
            estimatedCloseClass = 'accurate-narrow';
        }
        else if (absAccuracy <= 0.5) {
            estimatedCloseClass = 'accurate-wide';
        }
        else if (absAccuracy <= 1) {
            estimatedCloseClass = 'inaccurate-narrow';
        }
        else {
            estimatedCloseClass = 'inaccurate-wide';
        }
    }
    
    candle.estCloseOverallAverage = estimatedClose.toFixed(2);
    candle.estCloseOverallAverageDetails = details;
    candle.estCloseOverallAverageAccuracy = accuracy;
    candle.estCloseOverallAverageClassName = estimatedCloseClass;


    
    // Return data
    // averagePriceDifference = parseFloat(averagePriceDifference / records).toFixed(2);
    // estimatedClose = (!isOpeningCandle) ? parseFloat(previousCandle.close) + parseFloat(averagePriceDifference) :
    //                                       parseFloat(candle.open) + parseFloat(averagePriceDifference);
    // estimatedClose = estimatedClose.toFixed(2);
    // details = `${historicPairedCandles[0].timeString} - ${historicCandles[0].timeString}<br/>
    //             ${records} candles:<br/>
    //             ${details}
    //             Diff: $${averagePriceDifference}`;



}




// ----------------------------
// -- Helpers -- 
// ----------------------------


// Get the end of the current trading day (04:00)
// - TODO: Ignores weekends, but does not handle holidays (and half-days?)
function getCurrentTradingDate() { 
    const currentTradingDate = moment().startOf('day').set({h: 16, m: 0});
    if (currentTradingDate.day() === 0) currentTradingDate.subtract(2, 'days');
    else if (currentTradingDate.day() === 6) currentTradingDate.subtract(1, 'days');

    return currentTradingDate;
}

// Estimate the candle's price by using the average price change of previous candles with the same time
// * maxCandles: How many candles back to examine
// * dayOfWeekOnly: only include candles with the same dayOfWeek (ex: only Tuesdays)
// * TODO: Add a weighted strategy in the future (more recent changes = stronger, or day-of-week stronger)
function estimateCandlePrice(candles, candle, index, maxCandles, dayOfWeekOnly) {

    // is this the opening candle of the day (special rules - opening lacks a previous candle)
    let isOpeningCandle = candle.timeString === '09:35'; 
    let isOpeningCandleComplete = isOpeningCandle && candle.close; 
    let previousCandle = getPreviousCandle(candles, candle, index); 

    // PreviousCandle validation
    // - no previousCandle, also not the opening candle
    if (!previousCandle && !isOpeningCandle) return;
    // - no previousCandle, is the opening candle but incomplete
    if (!previousCandle && isOpeningCandle && !isOpeningCandleComplete) return;


    // Find all candles matching this candle's time (hh:mm) with different dates
    // Find all paired candles to compare with (usually the candle 5 minutes prior)
    let historicCandles =  findMatchingTimeCandles(candles, candle.date, 0, 'minutes', dayOfWeekOnly);
    let historicPairedCandles = [];
    
    // Default - pair historicCandles with the candles 5 minutes before it
    if (!isOpeningCandle && !previousCandle.futureCandle) {
        historicPairedCandles = findMatchingTimeCandles(candles, candle.date, -5, 'minutes', dayOfWeekOnly);
    }
    // Opening candle - only use historicCandles, and use its open price instead of close
    else if (isOpeningCandle) {
        historicPairedCandles = historicCandles;
    }
    // previousCandle.futureCandle - pair historicCandles whose time matches the first non-future candle
    // * If there are none today, return
    // * Ex: - The current candle is 12:30
    // - The current time is 12:02
    // - The most recent non-future candle to look at (has a close value) is 12:00
    else { 
        previousCandle = candles.find(x => x.dateString === candle.dateString && !x.futureCandle); 
        if (!previousCandle) return;
        historicPairedCandles = findMatchingTimeCandles(candles, previousCandle.date, 0, 'minutes', dayOfWeekOnly);
    }

    // data
    let averagePriceDifference = 0;
    let estimatedClose = 0;
    let estimatedCloseAccuracy = 0;
    let estimatedCloseClass = '';
    let details = '';

    let records = Math.min((historicCandles.length), maxCandles); 
    if (records === 0) return;

    // Average the priceDifference between each paired candle
    for(let i=0; i<records; i++) {      
        
        // Small fix for missing data / holidays / early market closes
        // * Just use 
        if (historicPairedCandles[i]) {
            let before = (!isOpeningCandle) ? historicPairedCandles[i].close : historicCandles[i].open;
            let after = historicCandles[i].close;
    
            let priceDifference = parseFloat((before - after) * -1).toFixed(2);
            averagePriceDifference += parseFloat(priceDifference);
    
            details += `${historicCandles[i].dateString}: ${before} -> ${after} = ${priceDifference}<br/>`;
        }
        else {
            historicPairedCandles[i] = historicCandles[i];
            historicPairedCandles[i].timeString = 'n/a';
            details += `n/a<br/>`;
        }

    }

    // Return data
    averagePriceDifference = parseFloat(averagePriceDifference / records).toFixed(2);
    estimatedClose = (!isOpeningCandle) ? parseFloat(previousCandle.close) + parseFloat(averagePriceDifference) :
                                          parseFloat(candle.open) + parseFloat(averagePriceDifference);
    estimatedClose = estimatedClose.toFixed(2);
    details = `${historicPairedCandles[0].timeString} - ${historicCandles[0].timeString}<br/>
                ${records} candles:<br/>
                ${details}
                Diff: $${averagePriceDifference}`;


    // If this close happened, record its accuracy
    if (candle.close) {
        estimatedCloseAccuracy = ((candle.close - estimatedClose) * -1).toFixed(2);
        let estimatedCloseAbsoluteAccuracy = Math.abs(estimatedCloseAccuracy);

        if (estimatedCloseAbsoluteAccuracy <= 0.25) {
            estimatedCloseClass = 'accurate-narrow';
        }
        else if (estimatedCloseAbsoluteAccuracy <= 0.5) {
            estimatedCloseClass = 'accurate-wide';
        }
        else if (estimatedCloseAbsoluteAccuracy <= 1) {
            estimatedCloseClass = 'inaccurate-narrow';
        }
        else {
            estimatedCloseClass = 'inaccurate-wide';
        }
    }

    return {
        averagePriceDifference: averagePriceDifference,
        estimatedClose: estimatedClose,
        estimatedCloseAccuracy: estimatedCloseAccuracy,
        estimatedCloseClass: estimatedCloseClass,
        details: details,
    }
}

// Find all candles that match the time (hh:mm) of a target date, and come before the date
// * Optionally, return candles that match the day-of-week as well (Tuesday)
function findMatchingTimeCandles(candles, date, units, value, dayOfWeekOnly) {
    const modifiedDt = date.clone().add(units, `${value}`);
    const timeString = modifiedDt.format('hh:mm');
    const dayNameString = modifiedDt.format('ddd');

    if (!dayOfWeekOnly) {
        return candles.filter(c => c.timeString === timeString && c.date.isBefore(modifiedDt));
    }
    else {
        return candles.filter(c => c.timeString === timeString && c.dayNameString === dayNameString && c.date.isBefore(modifiedDt));
    }
}

// Gets the candle 5 minutes before this candle
// * Faster method: Instead of doing date compares, return the next index (or undefined if the next index's dateString differs)
function getPreviousCandle(candles, candle, index) {

    let previousCandle = undefined;
    if (index < candles.length - 1) {
        previousCandle = candles[index+1];
        if (previousCandle.dateString !== candle.dateString) return undefined;
    }
    return previousCandle;

    // const d = moment(candle.date).subtract(5, 'minutes');
    // const c = candles.find(c => c.date.isSame(d));
    // return c;
}

export {getCurrentTradingDate, populateEstimates};