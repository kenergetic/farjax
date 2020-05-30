import React from 'react';
import { BrowserRouter, Route, Switch, Link } from 'react-router-dom';
import Stock from './Stock';
import StockChart from './StockChart';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
      <main>
        <div className="container-fluid">
          <nav className="navbar navbar-dark navbar-expand-md rounded bg-purple">
            <a className="navbar-brand" href="/">
              <h3>Farjax</h3>
            </a>
            <ul className="navbar-nav ml-auto">
              <li className="nav-item"><Link to={'/'} className="nav-link">Table</Link></li>
              <li className="nav-item"><Link to={'/chart'} className="nav-link">Chart</Link></li>
            </ul>
          </nav>
          <hr />
          <Switch>
              <Route path="/" component={Stock} exact />
              <Route path="/chart" component={StockChart} />
          </Switch>
        </div>
      </main>
  )
}

// function App() {
//   return (    
//     <div className="App">
//       <Stock></Stock>
//     </div>
//   );
// }

export default App;
