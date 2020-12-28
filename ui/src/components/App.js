import React from 'react'
import Cookies from 'js-cookie'
import { Router, Route, Switch } from 'react-router-dom'
import { ModalContainer, ModalRoute } from 'react-router-modal'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import { RetryLink } from 'apollo-link-retry'
import { onError } from 'apollo-link-error'
import { ApolloLink } from 'apollo-link'
import { ApolloProvider } from '@apollo/react-hooks'
import { refreshToken, logIn } from '../auth'
import history from '../history'
import 'normalize.css'
import 'react-router-modal/css/react-router-modal.css'
// import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import { ThemeProvider, ColorModeProvider, useColorMode } from '@chakra-ui/core'

import BrowseContainer from '../containers/BrowseContainer'
import ComponentsBrowser from '../components/ComponentsBrowser'
import Login from '../components/Login'
import Logout from '../components/Logout'
import PhotoDetailContainer from '../containers/PhotoDetailContainer'
import Onboarding from '../components/Onboarding'
import Settings from '../components/Settings'
import customTheme from '../theme'
import '../static/css/App.css'
import '../static/css/typography.css'

if (Cookies.get('refreshToken')) {
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
    createHttpLink({
      credentials: 'same-origin', // Required for older versions of Chromium (~v58)
    })
  ]),
  cache: new InMemoryCache(),
})

const App = ({ selectedFilters, onFilterToggle, onClearFilters }) => {
  const { colorMode, toggleColorMode } = useColorMode()
  const isMobileApp = navigator.userAgent.indexOf('PhotonixMobileApp') > -1

  return (
    <ApolloProvider client={client}>
      <Router history={history}>
        <ThemeProvider theme={customTheme}>
          <ColorModeProvider value="dark">
            <div className={isMobileApp && 'isMobileApp'}>
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
                  path="/onboarding"
                  parentPath="/"
                  component={Onboarding}
                  onBackdropClick={() => {}}
                  />
                <ModalRoute
                  path="/settings"
                  parentPath="/"
                  component={Settings}
                  />
                <ModalRoute
                  path="/photo/:photoId"
                  parentPath="/"
                  component={PhotoDetailContainer}
                  />
              </Switch>
              <ModalContainer />
            </div>
          </ColorModeProvider>
        </ThemeProvider>
      </Router>
    </ApolloProvider>
  )
}

export default App
