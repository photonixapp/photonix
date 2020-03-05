import React from 'react'
import { Router, Route, Switch } from 'react-router-dom'
import { ModalContainer, ModalRoute } from 'react-router-modal'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { RetryLink } from 'apollo-link-retry'
import { onError } from 'apollo-link-error'
import { ApolloLink } from 'apollo-link'
import { ApolloProvider } from '@apollo/react-hooks'
import { refreshToken, logIn } from '../auth'
import history from '../history'
import 'normalize.css'
import 'react-router-modal/css/react-router-modal.css'
// import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import { ThemeProvider } from '@chakra-ui/core'

import BrowseContainer from '../containers/BrowseContainer'
import ComponentsBrowser from '../components/ComponentsBrowser'
import Login from '../components/Login'
import Logout from '../components/Logout'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'
import Settings from '../components/Settings'
import customTheme from '../theme'
import '../static/css/App.css'
import '../static/css/typography.css'

if (localStorage.getItem('token')) {
  logIn()
  refreshToken()
} else {
  history.push('/login')
}

const client = new ApolloClient({
  link: ApolloLink.from([
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.forEach(({ message, locations, path }) => {
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          )
        })
      if (networkError) console.log(`[Network error]: ${networkError}`)
    }),
    new RetryLink(),
    new HttpLink(),
  ]),
  cache: new InMemoryCache(),
})

const App = ({ selectedFilters, onFilterToggle, onClearFilters }) => (
  <ApolloProvider client={client}>
    <Router history={history}>
      <ThemeProvider theme={customTheme}>
        {/* <CSSReset /> */}
        <Switch>
          <Route path="/login" render={() => <Login />} />
          <Route path="/logout" render={() => <Logout />} />
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
