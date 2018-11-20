import React from 'react'
import { BrowserRouter as Router, Route, Link } from 'react-router-dom'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'
import '../../static/css/App.css'
import FooterContainer from '../containers/FooterContainer'
import TagsContainer from '../containers/TagsContainer'
import MapContainer from '../containers/MapContainer'
import TimelineContainer from '../containers/TimelineContainer'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'

const client = new ApolloClient()

const App = () => (
  <ApolloProvider client={client}>
    <Router>
      <div className="flex-container-column">
        <header>
          <div className="logo" />
          <ul className="tabs">
            <Link to="/"><li>Timeline</li></Link>
            <Link to="/map"><li>Map</li></Link>
          </ul>
        </header>
        <div className="main flex-container-row">
          <section id="filters">
            <h2>Location</h2>
            <h2>Object</h2>
            <h2>Person</h2>
            <h2>Color</h2>
            <h2>Style</h2>
            <TagsContainer />
          </section>
          <section id="content">
            <Route exact path="/" component={TimelineContainer} />
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
