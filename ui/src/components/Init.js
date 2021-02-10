import React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import reducers from './../stores'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import { RetryLink } from 'apollo-link-retry'
import { onError } from 'apollo-link-error'
import { ApolloLink } from 'apollo-link'
import { ApolloProvider } from '@apollo/react-hooks'
import { Router } from 'react-router-dom'
import { ModalContainer } from 'react-router-modal'
// import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import { ThemeProvider, ColorModeProvider } from '@chakra-ui/core'

import history from '../history'
import customTheme from '../theme'

export const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

export const client = new ApolloClient({
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
    }),
  ]),
  cache: new InMemoryCache(),
})

const Init = ({ children }) => {
  const isMobileApp = navigator.userAgent.indexOf('PhotonixMobileApp') > -1

  // Higher Order Components (HOCs) grouped together here so can be reused by Storybook
  return (
    <Provider store={store}>
      <React.StrictMode>
        <ApolloProvider client={client}>
          <Router history={history}>
            <ThemeProvider theme={customTheme}>
              <ColorModeProvider value="dark">
                <div className={isMobileApp ? 'isMobileApp' : undefined}>
                  {/* <CSSReset /> */}
                  {children}
                  <ModalContainer />
                </div>
              </ColorModeProvider>
            </ThemeProvider>
          </Router>
        </ApolloProvider>
      </React.StrictMode>
    </Provider>
  )
}

export default Init
