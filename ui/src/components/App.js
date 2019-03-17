import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'
import 'normalize.css'
import '../static/css/App.css'
import '../static/css/typography.css'
import BrowseContainer from '../containers/BrowseContainer'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'
import SettingsContainer from '../containers/SettingsContainer'
import ComponentsBrowser from '../components/ComponentsBrowser'


const client = new ApolloClient()

const App = ({ selectedFilters, onFilterToggle, onClearFilters, onShowSettings, showSettings, onHideModals }) => (
  <ApolloProvider client={client}>
    <Router>
      <div>
        <Route path="/" exact render={(params) => <BrowseContainer selectedFilters={selectedFilters} search={params.location.search} onFilterToggle={onFilterToggle} onClearFilters={onClearFilters} onShowSettings={onShowSettings} />} />
        <Route path="/photo/:photoId" render={(params) => <PhotoDetailContainer photoId={params.match.params.photoId} />} />
        <Route path="/components" exact render={(params) => <ComponentsBrowser />} />
      </div>
    </Router>
    <SettingsContainer visible={showSettings} onHideModals={onHideModals} data={[
      {
        key: 'sourceDir',
        value: null,
        type: 'string',
        name: 'Source folder',
      },
      {
        key: 'watchSourceDir',
        value: null,
        type: 'boolean',
        name: 'Watch folder for new photos',
      },
    ]} />
  </ApolloProvider>
)

export default App
