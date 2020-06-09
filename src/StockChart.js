import React, { PureComponent } from 'react';
import {
    ReferenceLine, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import moment from 'moment-timezone';
import {populateEstimates, getCurrentTradingDate} from './CandleComparer';
import {populateAccuracy} from './CandleAccuracy';
import {fetchStock} from './CandleApi';

// Use EDT
moment.tz.setDefault('America/New_York');

// Track current times
let now = null;
let next = null;
let last  = null;
        

class StockChart extends React.Component {

    constructor(props) {
        super(props);

        this.state = { 
            candles: [],
            displayedCandles: [],
            tableCandles: [],
            data: [],
            pastTradingDays: 0,
            
            // How many days back of candles to show
            days: 1,
            // How many minutes ahead to forecast (whole day)
            minutesAhead: 480,

            // Chart Visibility
            showClose: true,
            showOverallAvg: true,
            showLastTd: false,
            showAvg: true,
            showDowAvg: false,

            // Chart: Draw two lines for the nearest 5 minute (and next 5) that the time is under
            referenceTime: '09:35',
            referenceTimeNext: '09:40',
            
            // Table visibility
            showOpen: false,
            showVol: false,
            showDailyAcc: true,
            showWeeklyAcc: false,
         };
    }

    async componentDidMount() {

        // Get stock data from the API, and calculate out estimates and accuracy
        await this.pullStockData();
        
        // Refresh every minute
        //this.intervalID = setInterval(this.pullStockData.bind(this), 5000);
        this.intervalID = setInterval(this.pullStockData.bind(this), 60000);
    }

    // Stop the interval from continuing to run
    componentWillUnmount() {
        clearInterval(this.intervalID);
    }

    
    // Get candle data from the API, and apply estimates and accuracy to it
    async pullStockData() {

        moment.tz.setDefault('America/New_York');
        
        // Get the times for chart calculations
        // * js date compares faster than moment         
        now = new Date(moment().format('MM/DD/YYYY HH:mm'));
        next = new Date(moment().add(5, 'minutes').format('MM/DD/YYYY HH:mm'));
        last = new Date(moment().subtract(5, 'minutes').format('MM/DD/YYYY HH:mm'));
        
        let candles = [];
        let chartCandles = [];
        let tableCandles = [];

        var coeff = 1000 * 60 * 5;
        var roundedDate = new Date(Math.floor(now.getTime() / coeff) * coeff);
        
        console.log( moment(roundedDate).format('hh:mm zz'));

        let referenceTime = '09:35';
        let referenceTimeNext = '09:35';
        //moment(roundedDate).add(5, 'minutes').format('hh:mm');

        // Chart range
        let currentTradingDay = getCurrentTradingDate();
        
        let daysBack = moment(getCurrentTradingDate().subtract(this.state.days, 'days'));
        let forecastRange = moment().add(this.state.minutesAhead, 'minutes');

        // ShortTable range
        let tableFrom = moment().subtract(10, 'minutes');
        let tableTo = moment().add(5, 'minutes');

        // * Debug: Day backtracking *
        // currentTradingDay.subtract(3, 'days');
        // forecastRange.subtract(3, 'days');

        // Get candles
        candles = await fetchStock(currentTradingDay, this.state.minutesAhead);
        
        // Calculate close estimates for each candle
        populateEstimates(candles);

        // Get the accuracy for each candle, and aggregate accuracy of each estimate
        populateAccuracy(candles);

        candles.sort((a, b) => {
            if (a.date.isSameOrAfter(b.date)) return -1;
            return 1;
        });

        chartCandles = candles.filter(x => x.date.tz('America/New_York').isAfter(daysBack) && x.date.isSameOrBefore(forecastRange));
        tableCandles = candles.filter(x => x.date.isAfter(tableFrom) && x.date.isSameOrBefore(tableTo));


        // Sort chart candles
        let data = chartCandles.sort((a, b) => {
            if (a.date.isSameOrAfter(b.date)) return 1;
            return -1;
        });

        // Set the reference lines to wherever the first close value is null
        for(var i=0; i<chartCandles.length; i++) {
            if (!chartCandles[i].close) {
                referenceTimeNext = chartCandles[i].timeString;
                if (i > 0) referenceTime = chartCandles[i - 1].timeString;
                break;
            }
        }

        // Candle data - approximately how many trading days of past data did we get
        let pastTradingDays = Math.ceil(candles.length / 78);

        this.setState({
            candles: candles,
            displayedCandles: chartCandles,
            tableCandles: tableCandles,
            data: data,

            referenceTime: referenceTime,
            referenceTimeNext: referenceTimeNext,
            pastTradingDays: pastTradingDays
        });
        
    }

    // --- Mess of a chart --- //

    render() {

        const tableClass = 'table table-striped';
        const headerClass = 'table-header';

        const btnGroup ='btn-group float-right p-2';
        const btnSecondary = 'btn btn-secondary';
        const btnSuccess = 'btn btn-success';

        // Specific table classes
        const futureRowClass = 'future-row';
        const estimateLast = 'estimate-last';
        const estimateAvg = 'estimate-average';
        const estimateDowAvg = 'estimate-dow-average';
        const estimateOverallAvg = 'estimate-overall';

        const symbolClass = 'symbol'
        const closePriceClass = 'close-price';

        // Tooltip classes
        const tooltip = 'tt';
        const tooltipText = 'ttt';

        return (
            <div>
                {/* Visibility */}
                <div className='row'>
                    <div className='col-sm-12 col-lg-4 offset-lg-1'>
                        <b>Historical data: {this.state.pastTradingDays} days</b>
                    </div>
                    <div className='col-sm-12 col-lg-6'>
                        <div className={btnGroup}>
                            <button className={this.state.showClose ? btnSuccess : btnSecondary } onClick={() => this.setState({ showClose: !this.state.showClose })}>Close</button>
                            <button className={this.state.showOverallAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showOverallAvg: !this.state.showOverallAvg })}>Overall Avg</button>
                            <button className={this.state.showLastTd ? btnSuccess : btnSecondary } onClick={() => this.setState({ showLastTd: !this.state.showLastTd })}>Last TD</button>
                            <button className={this.state.showAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showAvg: !this.state.showAvg })}>Average</button>
                            <button className={this.state.showDowAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showDowAvg: !this.state.showDowAvg })}>Day of week Avg</button>
                        </div>
                    </div>
                </div>
                
                {/* Chart */}
                <div className='row'>
                    <div className='col-sm-12 col-lg-10 offset-lg-1'>
                        <ResponsiveContainer width='100%' height={500}>
                            <ComposedChart
                                data={this.state.data}
                                margin={{
                                top: 5, right: 30, left: 20, bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="timeString" tick={<CustomizedXAxisTick />} interval={0} height={50} />
                                <YAxis yAxisId="left" type="number" 
                                    domain={[dataMin => (Math.floor(dataMin)), dataMax => (Math.ceil(dataMax))]} 
                                    //allowDecimals={false}
                                    interval={0}
                                    tick={<CustomizedYAxisTick />}
                                />
                                <YAxis yAxisId="right" orientation="right" type="number" domain={[0, dataMax => (Math.ceil(dataMax * 2 / 1000000) * 1000000)]} />

                                <Tooltip formatter={(value) => '$' + value} />
                                {/* <Tooltip content={<CustomTooltip />} /> */}
                                <Legend verticalAlign='top' verticalAlign='top'/>

                                <ReferenceLine x={this.state.referenceTime} stroke="#00f" yAxisId="left" />
                                <ReferenceLine x={this.state.referenceTimeNext} stroke="#f08" yAxisId="left" />

                                <Line yAxisId="left" type="monotone" dataKey={this.state.showLastTd ? "estCloseLastTd" : null} dot={<CustomizedDot/>}  opacity={0.6} stroke="#cccc88" strokeWidth={3}/>
                                <Line yAxisId="left" type="monotone" dataKey={this.state.showAvg ? "estCloseAverage" : null} dot={<CustomizedDot/>}  opacity={0.9} stroke="#8888cc" strokeWidth={3}/>
                                <Line yAxisId="left" type="monotone" dataKey={this.state.showDowAvg ? "estCloseDowAverage" : null} dot={<CustomizedDot/>} opacity={0.6} stroke="#88cc88" strokeWidth={3}/>
                                <Line yAxisId="left" type="monotone" dataKey={this.state.showOverallAvg ? "estCloseOverallAverage" : null} dot={<CustomizedDot/>} opacity={0.9} stroke="#88eedd" strokeWidth={3}/>
                                <Line yAxisId="left" type="monotone" dataKey={this.state.showClose ? "close" : null}  stroke="#000" dot={<CustomizedDot/>} activeDot={{ r: 8 }} strokeWidth={3}/>
                              
                                <Bar yAxisId="right" type="monotone" dataKey="volume" fill="#00aa11" />
  
                                
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                {/* Minitable */}
                <div className='row'>
                    <div className='col-sm-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2'>
                        <table className={tableClass}>
                            <thead>
                                <tr className={headerClass}>
                                    <td>Symbol</td>
                                    <td>Date</td>
                                    { this.state.showVol && <td>Volume</td>}
                                    { this.state.showOpen && <td>Open</td>}
                                    <td>Close</td>

                                    { this.state.showOverallAvg && <td>Estimate<br/><i>(Combined)</i></td> }
                                    { this.state.showOverallAvg && <td>Accuracy<br/>($)</td> }
                                    { this.state.showOverallAvg && this.state.showDailyAcc && <td>Daily<br/>(%)</td> }
                                    { this.state.showOverallAvg && this.state.showWeeklyAcc && <td>Weekly<br/>(%)</td> }

                                    { this.state.showLastTd && <td>Estimated<br/>(Previous)</td> }
                                    { this.state.showLastTd && <td>Accuracy<br/>($)</td> }
                                    { this.state.showLastTd && this.state.showDailyAcc && <td>Daily<br/>(%)</td> }
                                    { this.state.showLastTd && this.state.showWeeklyAcc && <td>Weekly<br/>(%)</td> }

                                    { this.state.showAvg && <td>Estimated<br/>(50 day)</td> }
                                    { this.state.showAvg && <td>Accuracy<br/>($)</td> }
                                    { this.state.showAvg && this.state.showDailyAcc && <td>Daily<br/>(%)</td> }
                                    { this.state.showAvg && this.state.showWeeklyAcc && <td>Weekly<br/>(%)</td> }
                                    
                                    { this.state.showDowAvg && <td>Estimated<br/>(DoW)</td> }
                                    { this.state.showDowAvg && <td>Accuracy<br/>($)</td> }
                                    { this.state.showDowAvg && this.state.showDailyAcc && <td>Daily<br/>(%)</td> }
                                    { this.state.showDowAvg && this.state.showWeeklyAcc && <td>Weekly<br/>(%)</td> }
                                </tr>
                            </thead>
                            <tbody>
                                {this.state.tableCandles.map((x, i) => (
                                    <tr key={x.date} className={(x.futureCandle) ? futureRowClass : ''}>
                                        <td className={symbolClass}>{x.name}</td>
                                        <td>{x.dateString} {x.timeString}</td>
                                        
                                        {/* Volume */}
                                        { this.state.showVol && <td>{(x.volume / 1000000).toFixed(1)}M</td>}
                                        
                                        {/* Open/close price */}
                                        { this.state.showOpen && <td>{x.open ? '$' + x.open : ''}</td>}
                                        <td className={closePriceClass}><b>{x.close ? '$' + x.close : ''}</b></td>

                                        {/* Overall Average */}
                                        { this.state.showOverallAvg &&
                                            <td className={estimateOverallAvg}>
                                                <div className={tooltip}>
                                                    <b>${x.estCloseOverallAverage}</b>
                                                    <span className={tooltipText} dangerouslySetInnerHTML={{__html: x.estCloseOverallAverageDetails}}></span>
                                                </div>
                                            </td> 
                                        }
                                        { this.state.showOverallAvg &&
                                            <td className={x.estCloseOverallAverageClassName}>{x.estCloseOverallAverageAccuracy}</td>
                                        }
                                        { this.state.showOverallAvg && this.state.showDailyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseOverallAverageAccuracyDaily}
                                                    <span className={tooltipText}>{x.estCloseOverallAverageAccuracyDailyNarrow}</span>
                                                </div>
                                            </td>
                                        }
                                        { this.state.showOverallAvg && this.state.showWeeklyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseOverallAverageAccuracyWeekly}
                                                    <span className={tooltipText}>{x.estCloseOverallAverageAccuracyWeeklyNarrow}</span>
                                                </div>
                                            </td>
                                        }

                                        {/* Last trading day */}
                                        { this.state.showLastTd &&
                                            <td className={estimateLast}>
                                                <div className={tooltip}>
                                                    <b>${x.estCloseLastTd}</b>
                                                    <span className={tooltipText} dangerouslySetInnerHTML={{__html: x.estCloseLastTdDetails}}></span>
                                                </div>
                                            </td> 
                                        }
                                        { this.state.showLastTd &&
                                            <td className={x.estCloseLastTdClassName}>{x.estCloseLastTdAccuracy}
                                            </td>
                                        }                                        
                                        { this.state.showLastTd && this.state.showDailyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseLastTdAccuracyDaily}
                                                    <span className={tooltipText}>{x.estCloseLastTdAccuracyDailyNarrow}</span>
                                                </div>
                                            </td>
                                        }
                                        { this.state.showLastTd && this.state.showWeeklyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseLastTdAccuracyWeekly}
                                                    <span className={tooltipText}>{x.estCloseLastTdAccuracyWeeklyNarrow}</span>
                                                </div>
                                            </td>
                                        }

                                        {/* Averages - last ten trading days */}
                                        { this.state.showAvg &&
                                            <td className={estimateAvg}>
                                                <div className={tooltip}>
                                                    <b>${x.estCloseAverage}</b>
                                                    <span className={tooltipText} dangerouslySetInnerHTML={{__html: x.estCloseAverageDetails}}></span>
                                                </div>
                                            </td> 
                                        }
                                        { this.state.showAvg &&
                                            <td className={x.estCloseAverageClassName}>{x.estCloseAverageAccuracy}</td>
                                        }                                        
                                        { this.state.showAvg && this.state.showDailyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseAverageAccuracyDaily}
                                                    <span className={tooltipText}>{x.estCloseAverageAccuracyDailyNarrow}</span>
                                                </div>
                                            </td>
                                        }
                                        { this.state.showAvg && this.state.showWeeklyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseAverageAccuracyWeekly}
                                                    <span className={tooltipText}>{x.estCloseAverageAccuracyWeeklyNarrow}</span>
                                                </div>
                                            </td>
                                        }


                                        {/* Averages - day of week */}
                                        { this.state.showDowAvg &&
                                            <td className={estimateDowAvg}>
                                                <div className={tooltip}>
                                                    <b>${x.estCloseDowAverage}</b>
                                                    <span className={tooltipText} dangerouslySetInnerHTML={{__html: x.estCloseDowAverageDetails}}></span>
                                                </div>
                                            </td> 
                                        }
                                        { this.state.showDowAvg &&
                                            <td className={x.estCloseDowAverageClassName}>{x.estCloseDowAverageAccuracy}</td>
                                        }                                        
                                        { this.state.showDowAvg && this.state.showDailyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseDowAverageAccuracyDaily}
                                                    <span className={tooltipText}>{x.estCloseDowAverageAccuracyDailyNarrow}</span>
                                                </div>
                                            </td>
                                        }
                                        { this.state.showDowAvg && this.state.showWeeklyAcc && 
                                            <td>
                                                <div className={tooltip}>
                                                    {x.estCloseDowAverageAccuracyWeekly}
                                                    <span className={tooltipText}>{x.estCloseDowAverageAccuracyWeeklyNarrow}</span>
                                                </div>
                                            </td>
                                        }

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            );
        }
}



// Only place a dot for the current 5-minute time and the next, if the line has a value
class CustomizedDot extends PureComponent {
    render() {
        const {cx, cy, stroke, payload, value} = this.props;
            
        // Don't draw a dot with no y
        if (!cy) return(<svg></svg>);

        // Get current time
        let axisDate = new Date(payload.dateString + '/' + new Date().getFullYear() + ' ' + payload.timeString);
        if (axisDate.getHours() <= 4) axisDate.setHours(axisDate.getHours() + 12); // AM to PM

        // Don't draw a dot if this is before the last tick
        if (axisDate <= last) return(<svg></svg>);

        const isCurrentTick = axisDate >= last && axisDate <= now && stroke === '#000';
        const isNextTick = axisDate >= now && axisDate <= next;

        if (isCurrentTick) {
            return (<svg><circle cx={cx} cy={cy} r="5" stroke="black" strokeWidth="1" fill="#08a" /></svg>)
        }
        else if (isNextTick) {
            return (<svg><circle cx={cx} cy={cy} r="5" stroke="black" strokeWidth="1" fill="#c04" /></svg>)
        }
        else {
            return(<svg></svg>)
        }
    }
}


class CustomizedXAxisTick extends PureComponent {
    render() {
    const {
        x, y, stroke, payload,
    } = this.props;

    let fillColor = '#999';
    let myStyle = {};
    
    // Get current time
    let axisDate = new Date(new Date().getMonth()+1 + '/' + new Date().getDate() + '/' + new Date().getFullYear() + ' ' + payload.value);
    if (axisDate.getHours() <= 4) axisDate.setHours(axisDate.getHours() + 12); // PM to AM

    // console.log(last);
    // console.log(axisDate);

    // Don't highlight if this is before the last tick
    if (axisDate >= last) {
        // IsCurrentTick: Only place a dot for the closing chart
        const isCurrentTick = axisDate >= last && axisDate <= now;
        const isNextTick = axisDate >= now && axisDate <= next;

        if (isCurrentTick) {
            fillColor = '#08a';
            myStyle = {'fontWeight': 'bold'};
        }
        else if (isNextTick) {
            fillColor = '#f0a';
            myStyle = {'fontWeight': 'bold'};
        }
        else {
            fillColor = '#888';
        }
    }
    
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={5} dx={0} textAnchor="end" fill={fillColor} transform="rotate(-90)" style={myStyle}>{payload.value}</text>
        </g>
    );
    }
}

class CustomizedYAxisTick extends PureComponent {
    render() {
        const {
            x, y, stroke, payload,
        } = this.props;

        //console.log(payload.value);
        return (
            <g transform={`translate(${x},${y})`}>
                <text textAnchor="end" fill="#666">${payload.value}</text>
            </g>
        );
    }
}

export default StockChart;