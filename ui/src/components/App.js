import React from 'react'
import { Router, Route, Switch } from 'react-router-dom'
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

import history from '../history'


const client = new ApolloClient()

const App = ({ selectedFilters, onFilterToggle, onClearFilters, onHideModals, settings, onGetParentSettings }) => (
  <ApolloProvider client={client}>
    <Router history={history}>
      <div>
          <BrowseContainer selectedFilters={selectedFilters} search="" onFilterToggle={onFilterToggle} onClearFilters={onClearFilters} />

          <Switch>
            <ModalRoute path="/photo/:photoId" parentPath="/" component={PhotoDetailContainer} />
            <ModalRoute path="/settings" parentPath="/" component={SettingsContainer}  />
            <Route path="/components" exact render={(params) => <ComponentsBrowser />} />
          </Switch>
          <ModalContainer />
      </div>
    </Router>

    {/* <SettingsContainer visible={showSettings} onHideModals={onHideModals} onGetParentSettings={onGetParentSettings} settings={settings} data={[
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
    ]} /> */}
  </ApolloProvider>
)

export default App
