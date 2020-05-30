import React from 'react';

class StockChart extends React.Component {
    
    constructor(props) {
        super(props);
        this.state = { 
            foo: 'bar'
         };
    }

    async componentDidMount() {
        console.log('Hello there');
    }

    // Stop the interval from continuing to run
    componentWillUnmount() {
    }

    
    // --- Mess of a chart --- //

    render() {

        return (
            <div>
                Stock Chart!!
            </div>
        );
    }

}

export default StockChart;