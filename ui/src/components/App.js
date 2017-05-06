import React from 'react'
import { BrowserRouter as Router, Route, Link } from 'react-router-dom'
import '../../static/css/App.css'
import FooterContainer from '../containers/FooterContainer'
import Tags from './Tags'
import MapContainer from '../containers/MapContainer'
import TimelineContainer from '../containers/TimelineContainer'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'


const Topic = ({ match }) => (
  <div>
    <h3>{match.params.topicId}</h3>
  </div>
)

const App = () => (
  <Router>
    <div className="flex-container-column">
      <header>
        <div className="logo"></div>
        <ul className="tabs">
          <li><Link to="/">Timeline</Link></li>
          <li><Link to="/map">Map</Link></li>
          <li><button is="google-cast-button"></button></li>
        </ul>
      </header>
      <div className="main flex-container-row">
        <section id="filters">
          <h2>Date range</h2>
          <h2>Tags</h2>
          <Tags />
          <h2>People</h2>
          <h2>Cameras</h2>
        </section>
        <section id="content">
          <Route exact path="/" component={TimelineContainer}/>
          <Route path="/map" component={MapContainer}/>
          <Route path="/photo/:photoId" component={PhotoDetailContainer}/>
        </section>
      </div>
      <FooterContainer />
    </div>
  </Router>
)

export default App
