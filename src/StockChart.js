import React, { PureComponent } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import moment from 'moment-timezone';
import {populateEstimates, getCurrentTradingDate} from './CandleComparer';
import {populateAccuracy} from './CandleAccuracy';
import {fetchStock} from './CandleApi';




class StockChart extends React.Component {

    constructor(props) {
        super(props);

        this.state = { 
            candles: [],
            displayedCandles: [],
            data: [],
            
            // How many days back of candles to show
            days: 1,
            // How many minutes ahead to forecast (whole day)
            minutesAhead: 480,

            // Visibility
            showClose: true,
            showOverallAvg: true,
            showLastTd: false,
            showAvg: false,
            showDowAvg: false
         };
    }

    async componentDidMount() {

        // Get stock data from the API, and calculate out estimates and accuracy
        await this.pullStockData();
        
        // Refresh every minute
        this.intervalID = setInterval(this.pullStockData.bind(this), 60000);
    }

    // Stop the interval from continuing to run
    componentWillUnmount() {
        clearInterval(this.intervalID);
    }

    
    // Get candle data from the API, and apply estimates and accuracy to it
    async pullStockData() {

        console.log(moment().format('MM/DD') +  ': refreshing data');

        let candles = [];
        let displayedCandles = [];

        let currentTradingDay = getCurrentTradingDate();
        let daysBack = moment(getCurrentTradingDate().subtract(this.state.days, 'days'));
        let forecastRange = moment().add(this.state.minutesAhead, 'minutes');

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
            if (a.date.isAfter(b.date)) return -1;
            return 1;
        });

        displayedCandles = candles.filter(x => x.date.isAfter(daysBack) && x.date.isBefore(forecastRange));

        // TODO: Massage data
        let data = displayedCandles.sort((a, b) => {
            if (a.date.isAfter(b.date)) return 1;
            return -1;
        });
        
        this.setState({
            candles: candles,
            displayedCandles: displayedCandles,
            data: data
        });
        
    }

    // --- Mess of a chart --- //

    render() {

        const btnGroup ='btn-group float-right p-2';
        const btnSecondary = 'btn btn-secondary';
        const btnSuccess = 'btn btn-success';

        return (
            <div>
                
                <div className='row'>
                    <div className='col-sm-12'>
                        <div className={btnGroup}>
                            <button className={this.state.showClose ? btnSuccess : btnSecondary } onClick={() => this.setState({ showClose: !this.state.showClose })}>Close</button>
                            <button className={this.state.showOverallAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showOverallAvg: !this.state.showOverallAvg })}>Overall Avg</button>
                            <button className={this.state.showLastTd ? btnSuccess : btnSecondary } onClick={() => this.setState({ showLastTd: !this.state.showLastTd })}>Last TD</button>
                            <button className={this.state.showAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showAvg: !this.state.showAvg })}>Average</button>
                            <button className={this.state.showDowAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showDowAvg: !this.state.showDowAvg })}>Day of week Avg</button>
                        </div>
                    </div>
                </div>

                {/* Visibility */}
                <div className='row'>
                    <div className='col-sm-12 col-lg-10 offset-lg-1'>
                    <ResponsiveContainer width='100%' height={600}>
                        <LineChart
                            data={this.state.data}
                            margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="timeString" tick={<CustomizedXAxisTick />} interval={0} height={50}/>
                            <YAxis type="number" 
                                domain={['auto', 'auto']} 
                                allowDecimals={false}
                                interval={0}
                                tick={<CustomizedYAxisTick />}
                            />
                            <Tooltip formatter={(value) => '$' + value} />
                            <Legend verticalAlign='top' verticalAlign='top'/>
                            <Line type="monotone" dataKey={this.state.showLastTd ? "estCloseLastTd" : null} dot={<CustomizedDot/>}  opacity={0.5} stroke="#00a0a1" strokeWidth={3}/>
                            <Line type="monotone" dataKey={this.state.showAvg ? "estCloseAverage" : null} dot={<CustomizedDot/>}  opacity={0.5} stroke="#427eb9" strokeWidth={3}/>
                            <Line type="monotone" dataKey={this.state.showDowAvg ? "estCloseDowAverage" : null} dot={<CustomizedDot/>} opacity={0.5} stroke="#67798a" strokeWidth={3}/>
                            <Line type="monotone" dataKey={this.state.showOverallAvg ? "estCloseOverallAverage" : null} dot={<CustomizedDot/>} opacity={0.75} stroke="#21a672" strokeWidth={3}/>
                            <Line dataKey={this.state.showClose ? "close" : null} connectNulls type="monotone" stroke="#000" dot={<CustomizedDot/>} activeDot={{ r: 8 }} strokeWidth={3}/>
                        </LineChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>
            );
        }
}

// Return a dot for the current 5-minute time and the next, if the line has a value
class CustomizedDot extends PureComponent {
    render() {
        const {cx, cy, stroke, payload, value} = this.props;
        
        // No charted value - return nothing
        if (cy === null) return(<svg></svg>);

        // Lazy compare - color the current X-tick, and color future X-ticks 
        let axisTime = moment(payload.timeString, 'HH:mm');
        let now = moment();
        let next = moment().add(5, 'minutes');
        let last = moment().subtract(5, 'minutes');

        if (axisTime.hour() >= 1 && axisTime.hour() <= 4) axisTime.add(12, 'hours');
        if (axisTime.isAfter(last) && axisTime.isBefore(now)) {
            return (<circle cx={cx} cy={cy} r="5" stroke="black" strokeWidth="1" fill="#08a" />)
        }
        else if (axisTime.isAfter(now) && axisTime.isBefore(next)) {            
            return (<circle cx={cx} cy={cy} r="5" stroke="black" strokeWidth="1" fill="#c04" />)
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
    
    // Lazy compare - color the current X-tick, and color future X-ticks 
    let axisTime = moment(payload.value, 'HH:mm');
    let now = moment();
    let next = moment().add(5, 'minutes');
    let last = moment().subtract(5, 'minutes');

    if (axisTime.hour() >= 1 && axisTime.hour() <= 4) axisTime.add(12, 'hours');
    if (axisTime.isAfter(last) && axisTime.isBefore(now)) {
        fillColor = '#08a';
        myStyle = {'fontWeight': 'bold'};
    }
    else if (axisTime.isAfter(now) && axisTime.isBefore(next)) {
        fillColor = '#f0a';
        myStyle = {'fontWeight': 'bold'};
    }
    else if (axisTime.isAfter(now)) {        
        fillColor = '#c04';
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

        console.log(payload.value);

        return (
            <g transform={`translate(${x},${y})`}>
                <text textAnchor="end" fill="#666">${payload.value}</text>
            </g>
        );
    }
}

export default StockChart;