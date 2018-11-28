import React from 'react'
import { BrowserRouter as Router, Route, Link } from 'react-router-dom'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'
import 'normalize.css'
import '../static/css/App.css'
import SearchContainer from '../containers/SearchContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
// import MapContainer from '../containers/MapContainer'
// import PhotoDetailContainer from '../containers/PhotoDetailContainer'
// import FooterContainer from '../containers/FooterContainer'


const client = new ApolloClient()

const App = ({ selectedFilters, onToggle }) => (
  <ApolloProvider client={client}>
    <Router>
      <div className="flex-container-column">
        <header>
          <SearchContainer selectedFilters={selectedFilters} onToggle={onToggle} />
          <ul className="tabs">
            <Link to="/"><li>Timeline</li></Link>
            <Link to="/map"><li>Map</li></Link>
          </ul>
        </header>
        <div className="main flex-container-row">
          <section id="content">
            <Route exact path="/" render={() => <PhotoListContainer selectedFilters={selectedFilters} />} />
            {/* <Route path="/map" component={MapContainer} /> */}
            {/* <Route path="/photo/:photoId" component={PhotoDetailContainer} /> */}
          </section>
        </div>
        {/* <FooterContainer /> */}
      </div>
    </Router>
  </ApolloProvider>
)

export default App
