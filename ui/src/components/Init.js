import React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  from,
  HttpLink,
  InMemoryCache,
} from '@apollo/client'
import { RetryLink } from '@apollo/client/link/retry'
import { Router } from 'react-router-dom'
import { ModalContainer } from 'react-router-modal'
// import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import { ThemeProvider, ColorModeProvider } from '@chakra-ui/core'

import history from '../history'
import reducers from './../stores'
import customTheme from '../theme'
import { logOut } from '../auth'

export const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
// Used by mobile app to set layout properties
window.photonix = {
  store: store,
}

const additiveLink = from([
  new RetryLink({
    delay: {
      initial: 500,
      max: Infinity,
      jitter: true,
    },
    attempts: {
      max: 30,
    },
  }),
  new ApolloLink((operation, forward) => {
    return forward(operation).map((data) => {
      // Raise GraphQL errors as exceptions that trigger RetryLink when re-authentication is in progress
      if (data && data.errors && data.errors.length > 0) {
        if (data.errors[0].message === 'Error decoding signature') {
          // Probably the Django SECRET_KEY changed so the user needs to re-authenticate.
          logOut()
        }
        throw new Error('GraphQL Operational Error')
      }
      return data
    })
  }),
  new HttpLink({
    uri: '/graphql',
    credentials: 'same-origin', // Required for older versions of Chromium (~v58)
  }),
])

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: additiveLink,
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
