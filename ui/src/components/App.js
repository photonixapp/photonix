import React from 'react'
import { BrowserRouter as Router, Route, Link } from 'react-router-dom'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'
import '../../static/css/App.css'
import FooterContainer from '../containers/FooterContainer'
import MapContainer from '../containers/MapContainer'
import TimelineContainer from '../containers/TimelineContainer'
import SearchContainer from '../containers/SearchContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'

const client = new ApolloClient()

const App = () => (
  <ApolloProvider client={client}>
    <Router>
      <div className="flex-container-column">
        <header>
          {/* <div className="logo" /> */}
          <SearchContainer />
          <ul className="tabs">
            <Link to="/"><li>Timeline</li></Link>
            <Link to="/map"><li>Map</li></Link>
          </ul>
        </header>
        <div className="main flex-container-row">
          <section id="content">
            {/* <Route exact path="/" component={TimelineContainer} /> */}
            <Route exact path="/" component={PhotoListContainer} />
            <Route path="/map" component={MapContainer} />
            <Route path="/photo/:photoId" component={PhotoDetailContainer} />
          </section>
        </div>
        <FooterContainer />
      </div>
    </Router>
  </ApolloProvider>
)

export default App
