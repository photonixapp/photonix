import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { ModalContainer, ModalRoute } from 'react-router-modal'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'
import 'normalize.css'
import 'react-router-modal/css/react-router-modal.css';
import '../static/css/App.css'
import '../static/css/typography.css'
import BrowseContainer from '../containers/BrowseContainer'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'
import SettingsContainer from '../containers/SettingsContainer'
import ComponentsBrowser from '../components/ComponentsBrowser'


const client = new ApolloClient()

const App = ({ selectedFilters, onFilterToggle, onClearFilters, onShowSettings, showSettings, onHideModals, settings, onGetParentSettings }) => (
  <ApolloProvider client={client}>
    <Router>
      <div>
        <Route path="/" render={(params) => <BrowseContainer selectedFilters={selectedFilters} search={params.location.search} onFilterToggle={onFilterToggle} onClearFilters={onClearFilters} onShowSettings={onShowSettings} />} />
        <ModalRoute path="/photo/:photoId" parentPath="/" component={PhotoDetailContainer} />
        <Route path="/components" exact render={(params) => <ComponentsBrowser />} />
        <ModalContainer />
      </div>
    </Router>
    <SettingsContainer visible={showSettings} onHideModals={onHideModals} onGetParentSettings={onGetParentSettings} settings={settings} data={[
      {
        key: 'sourceDirs',
        type: 'path',
        name: 'Source folder',
      },
      {
        key: 'watchSourceDirs',
        type: 'boolean',
        name: 'Watch folder for new photos',
      },
    ]} />
  </ApolloProvider>
)

export default App
