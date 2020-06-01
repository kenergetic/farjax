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
            chartData: [],
            
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
        //this.intervalID = setInterval(this.pullStockData.bind(this), 60000);
    }

    // Stop the interval from continuing to run
    componentWillUnmount() {
        clearInterval(this.intervalID);
    }

    
    // Get candle data from the API, and apply estimates and accuracy to it
    async pullStockData() {

        console.log('chart: refreshing data');

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
        let chartData = displayedCandles.sort((a, b) => {
            if (a.date.isAfter(b.date)) return 1;
            return -1;
        });
        
        this.setState({
            candles: candles,
            displayedCandles: displayedCandles,
            chartData: chartData
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
                    <div className='col-sm-12 col-lg-8 offset-lg-2'>
                    <ResponsiveContainer width='100%' height={500}>
                        <LineChart
                            data={this.state.chartData}
                            margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="timeString" tick={<CustomizedAxisTick />} height={50}/>
                            <YAxis type="number" domain={['auto', 'auto']} 
                                    allowDecimals={false} />
                            <Tooltip />
                            <Legend verticalAlign='top' verticalAlign='top'/>
                            <Line  dataKey={this.state.showClose ? "close" : null} stroke="#e49981" dot={false} activeDot={{ r: 8 }} strokeWidth={3}/>
                            <Line type="monotone" dataKey={this.state.showOverallAvg ? "estCloseOverallAverage" : null} dot={false} stroke="#2156c2" strokeWidth={3}/>
                            <Line type="monotone" dataKey={this.state.showLastTd ? "estCloseLastTd" : null} dot={false} stroke="#0070a1" strokeWidth={2}/>
                            <Line type="monotone" dataKey={this.state.showAvg ? "estCloseAverage" : null} dot={false} stroke="#424e59" strokeWidth={2}/>
                            <Line type="monotone" dataKey={this.state.showDowAvg ? "estCloseDowAverage" : null} dot={false} stroke="#67798a" strokeWidth={2}/>
                        </LineChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>
            );
        }
}


class CustomizedAxisTick extends PureComponent {
    render() {
    const {
        x, y, stroke, payload,
    } = this.props;

    return (
        <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-40)">{payload.value}</text>
        </g>
    );
    }
}

class CustomizedLabel extends PureComponent {
    render() {
      const {
        x, y, stroke, value,
      } = this.props;
  
      return <text x={x} y={y} dy={-4} fill={stroke} fontSize={10} textAnchor="middle">{value}</text>;
    }
  }
  

export default StockChart;