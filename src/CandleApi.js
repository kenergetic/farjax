import moment from 'moment-timezone';


// AlphaVantage API

// Used when aggregating data, this will give a candle a relative count (ex: 9:45 = 3, the 3rd closed candle of a trading day)
// * 90 candles in a day, 450 candles in a normal trading week
const timeIndex = [
    '09:35', '09:40', '09:45', '09:50', '09:55',
    '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55',
    '11:00', '11:05', '11:10', '11:15', '11:20', '11:25', '11:30', '11:35', '11:40', '11:45', '11:50', '11:55',
    '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55',
    '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55',
    '01:00', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30', '01:35', '01:40', '01:45', '01:50', '01:55',
    '02:00', '02:05', '02:10', '02:15', '02:20', '02:25', '02:30', '02:35', '02:40', '02:45', '02:50', '02:55',
    '03:00', '03:05', '03:10', '03:15', '03:20', '03:25', '03:30', '03:35', '03:40', '03:45', '03:50', '03:55',
    '04:00'
];


// Get recent candles for a stock from the api (currently only SPY)
async function fetchStock(currentTradingDay) {

    let candles = [];
    // Use EDT
    moment.tz.setDefault('America/New_York');

    // Get data from the API
    await fetch(process.env.REACT_APP_API_URL + 'stocks/get/spy')
        .then(res => res.json())
        .then(
            (data) => {
                data.forEach((x) => {
                    const dt = moment(x.date);
                    const candle = {
                        name: x.name,
                        date: dt,
                        open: x.open.toFixed(2),
                        high: x.high.toFixed(2),
                        low: x.low.toFixed(2),
                        close: x.close.toFixed(2),
                        nextClose: 0,
                        volume: x.volume,
                        
                        // Parts of the date in string format, to reduce complex comparisons
                        dateString: dt.format('M/DD'),
                        timeString: dt.format('hh:mm'),
                        dayNameString: dt.format('ddd'),
                        weekNumber: dt.format('W'),
                    }

                    // Multiply by dayOfWeek (Mon=1, Tues=2, Wed=3, etc)
                    candle.candleIndex = timeIndex.indexOf(candle.timeString) + 90 * candle.date.day();
                    candles.push(candle);
                });
            }
        );

    // Create empty 5 minute candles for the rest of the current trade day
    populateCurrentTradingDate(candles, currentTradingDay);

    // Sort candles
    candles.sort((a, b) => {
        if (a.date.isAfter(b.date)) return -1;
        return 1;
    });

    return candles;
}


// Create entries for each missing candle in the current day (9:30am - 4pm EDT)
function populateCurrentTradingDate(candles, currentTradingDay) {

    const SYMBOL = 'SPY';
    currentTradingDay.add(5, 'minutes');

    // Create ticks for dates that have not occured yet
    for(var i=0; i<78; i++) {

        let currentCandle = currentTradingDay.subtract(5, 'minutes');
        let candleExists = candles.find(x => x.date.isSame(currentCandle));

        // Look ahead up to the rest of today
        let now = moment().add(480, 'minutes');
        if (currentCandle.isAfter(now)) {
            continue;
        }

        if (!candleExists) {
            const dt = currentCandle.clone();

            const candle = {
                name: SYMBOL,
                date: dt,
                open: null,
                high: null,
                low: null,
                close: null,
                volume: 0,
                futureCandle: true,
                
                // Parts of the date in string format, to reduce complex comparisons
                dateString: dt.format('M/DD'),
                timeString: dt.format('hh:mm'),
                dayNameString: dt.format('ddd'),
                weekNumber: dt.format('W'),
            }
            
            // Multiply by dayOfWeek (Mon=1, Tues=2, Wed=3, etc)
            candle.candleIndex = timeIndex.indexOf(candle.timeString) + 90 * candle.date.day();

            candles.push(candle);
        }
    }
}


export {fetchStock};