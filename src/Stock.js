import React from 'react';
import moment from 'moment-timezone';
import {populateEstimates, getCurrentTradingDate} from './CandleComparer';
import {populateAccuracy} from './CandleAccuracy';
import {fetchStock} from './CandleApi';


// TODO: Change the component layout so Stock(Table) and StockChart share the api call

class Stock extends React.Component {

    intervalID;
    
    constructor(props) {
        super(props);
        this.state = { 
            candles: [],
            displayedCandles: [],
            pastTradingDays: 0,
            
            // How many days back of candles to show
            days: 3,
            // How many minutes ahead to forecast
            minutesAhead: 15,

            // Visibility
            showOpen: true,
            showVol: false,
            showLastTd: true,
            showAvg: true,
            showDowAvg: true,
            showOverallAvg: true,
            showDailyAcc: true,
            showWeeklyAcc: false,
         };
         
        this.handleChangeDays = this.handleChangeDays.bind(this);
        this.handleChangeForecast = this.handleChangeForecast.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
         
        // Use EDT
        moment.tz.setDefault('America/New_York');
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

        //console.log(moment().format('MM/DD') +  ': refreshing data');

        let candles = [];
        let displayedCandles = [];

        let currentTradingDay = getCurrentTradingDate();
        let daysBack = moment(getCurrentTradingDate().subtract(this.state.days, 'days'));
        let forecastRange = moment().add(this.state.minutesAhead, 'minutes');

        // * Debug: Day backtracking *
        // currentTradingDay.subtract(3, 'days');
        // forecastRange.subtract(3, 'days');

        // Get candles
        // console.time('fetch data');
        candles = await fetchStock(currentTradingDay, this.state.minutesAhead);
        // console.timeEnd('fetch data');
        
        // Calculate close estimates for each candle
        // console.time('populateEstimates');
        populateEstimates(candles);
        // console.timeEnd('populateEstimates');

        // Get the accuracy for each candle, and aggregate accuracy of each estimate
        // console.time('populateAccuracy');
        populateAccuracy(candles);
        // console.timeEnd('populateAccuracy');

        candles.sort((a, b) => {
            if (a.date.isAfter(b.date)) return -1;
            return 1;
        });

        displayedCandles = candles.filter(x => x.date.isAfter(daysBack) && x.date.isBefore(forecastRange));

        // Candle data - approximately how many trading days of past data did we get
        let pastTradingDays = Math.ceil(candles.length / 78);

        this.setState({
            candles: candles,
            displayedCandles: displayedCandles,
            pastTradingDays: pastTradingDays
        });
    }



    // Adjust range
    handleSubmit(event) {
        
        let daysBack = moment(getCurrentTradingDate().subtract(this.state.days, 'days'));
        let forecastRange = moment().add(this.state.minutesAhead, 'minutes');

        // * Debug: Day backtracking *
        // currentTradingDay.subtract(3, 'days');
        // forecastRange.subtract(3, 'days');

        let dc = this.state.candles.filter(x => x.date.isAfter(daysBack) && x.date.isBefore(forecastRange));

        this.setState({
            displayedCandles: dc
        });

        event.preventDefault();
    }
    handleChangeForecast(event) {
        this.setState({
            minutesAhead: event.target.value
        });
        
    }
    handleChangeDays(event) {
        this.setState({
            days: event.target.value
        });
        
    }


    
    // --- Mess of a table output --- //

    render() {

        // Container/Table bootstrap classes
        const colClass = 'col-sm-12 col-lg-10 offset-lg-1';
        const tableClass = 'table table-striped';
        const headerClass = 'table-header';

        // Form
        const formInline = 'form-inline';
        const formGroup = 'form-group mb-4 ml-4';
        const textbox = 'form-control textbox-sm';
        const floatRight = 'float-right';
        const paddingRight = 'pr-4';

        // Toggle visibility buttons
        const btnGroup ='btn-group float-right p-2';
        const btnInfo = 'btn btn-info';
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
                {/* Adjust time range */}
                <div className='row'>
                    <div className={colClass}>
                        <div className={floatRight}>
                            <form className={formInline} onSubmit={this.handleSubmit}>
                                <div className={formGroup}>                            
                                    <label className={paddingRight}>Days Back:</label>
                                    <input type="text" className={textbox} value={this.state.days} onChange={this.handleChangeDays}></input>
                                    <input className={btnInfo} type="submit" value="Go"/>
                                </div>
                                <div className={formGroup}>                            
                                    <label className={paddingRight}>Minutes Ahead:</label>
                                    <input type="text" className={textbox} value={this.state.minutesAhead} onChange={this.handleChangeForecast}></input>
                                    <input className={btnInfo} type="submit" value="Go"/>
                                </div>
                            </form> 
                        </div>
                    </div>
                </div>

                {/* Visibility */}
                <div className='row'>
                    <div className={colClass}>
                        
                        <b>Historical data: {this.state.pastTradingDays} days</b>
                        <div className={btnGroup}>
                            <button className={this.state.showOverallAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showOverallAvg: !this.state.showOverallAvg })}>Overall Avg</button>
                            <button className={this.state.showLastTd ? btnSuccess : btnSecondary } onClick={() => this.setState({ showLastTd: !this.state.showLastTd })}>Last TD</button>
                            <button className={this.state.showAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showAvg: !this.state.showAvg })}>Average</button>
                            <button className={this.state.showDowAvg ? btnSuccess : btnSecondary } onClick={() => this.setState({ showDowAvg: !this.state.showDowAvg })}>Day of week Avg</button>
                        </div>
                        <div className={btnGroup}>
                            <button className={this.state.showOpen ? btnSuccess : btnSecondary } onClick={() => this.setState({ showOpen: !this.state.showOpen })}>Open</button>
                            <button className={this.state.showVol ? btnSuccess : btnSecondary } onClick={() => this.setState({ showVol: !this.state.showVol })}>Volume</button>
                            <button className={this.state.showDailyAcc ? btnSuccess : btnSecondary } onClick={() => this.setState({ showDailyAcc: !this.state.showDailyAcc })}>Daily %</button>
                            <button className={this.state.showWeeklyAcc ? btnSuccess : btnSecondary } onClick={() => this.setState({ showWeeklyAcc: !this.state.showWeeklyAcc })}>Weekly %</button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className='row'>
                    <div className={colClass}>
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
                                {this.state.displayedCandles.map((x, i) => (
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

export default Stock;