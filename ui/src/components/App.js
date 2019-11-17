import React from 'react'
import { Router, Route, Switch } from 'react-router-dom'
import { ModalContainer, ModalRoute } from 'react-router-modal'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'
import history from '../history'
import 'normalize.css'
import 'react-router-modal/css/react-router-modal.css'
import { ThemeProvider, CSSReset } from '@chakra-ui/core'

import BrowseContainer from '../containers/BrowseContainer'
import ComponentsBrowser from '../components/ComponentsBrowser'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'
import Settings from '../components/Settings'
import customTheme from '../theme'
import '../static/css/App.css'
import '../static/css/typography.css'

const client = new ApolloClient()

const App = ({ selectedFilters, onFilterToggle, onClearFilters }) => (
  <ApolloProvider client={client}>
    <Router history={history}>
      <ThemeProvider theme={customTheme}>
        {/* <CSSReset /> */}
        <Switch>
          <ModalRoute
            path="/photo/:photoId"
            parentPath="/"
            component={PhotoDetailContainer}
          />
          <ModalRoute
            path="/settings"
            parentPath="/"
            component={() => <Settings />}
          />
          <Route
            path="/components"
            exact
            render={() => <ComponentsBrowser />}
          />
          <BrowseContainer
            selectedFilters={selectedFilters}
            search=""
            onFilterToggle={onFilterToggle}
            onClearFilters={onClearFilters}
          />
        </Switch>
        <ModalContainer />
      </ThemeProvider>
    </Router>
  </ApolloProvider>
)

export default App
