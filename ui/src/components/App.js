import React from 'react'
import { Router, Route, Switch } from 'react-router-dom'
import { ModalContainer, ModalRoute } from 'react-router-modal'
import ApolloClient from 'apollo-boost'
import { ApolloProvider } from '@apollo/react-hooks'
import history from '../history'
import 'normalize.css'
import 'react-router-modal/css/react-router-modal.css'
// import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import { ThemeProvider } from '@chakra-ui/core'

import BrowseContainer from '../containers/BrowseContainer'
import ComponentsBrowser from '../components/ComponentsBrowser'
// import Login from '../components/Login'
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
          {/* <Route path="/login" render={Login} /> */}
          <Route path="/components" render={ComponentsBrowser} />
          <Route
            path="/"
            render={() => (
              <BrowseContainer
                selectedFilters={selectedFilters}
                search=""
                onFilterToggle={onFilterToggle}
                onClearFilters={onClearFilters}
              />
            )}
          />
        </Switch>
        <Switch>
          <ModalRoute
            path="/photo/:photoId"
            parentPath="/"
            component={PhotoDetailContainer}
          />
          <ModalRoute path="/settings" parentPath="/" component={Settings} />
        </Switch>
        <ModalContainer />
      </ThemeProvider>
    </Router>
  </ApolloProvider>
)

export default App
