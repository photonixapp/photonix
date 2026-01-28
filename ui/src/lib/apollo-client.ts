import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { ErrorLink } from '@apollo/client/link/error'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { RetryLink } from '@apollo/client/link/retry'
import { getAccessToken, clearTokens } from './auth/auth-store'

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken()
  return {
    headers: {
      ...headers,
      authorization: token ? `JWT ${token}` : '',
    },
  }
})

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      const message = err.message || ''
      if (
        message.includes('Signature has expired') ||
        message.includes('Error decoding signature') ||
        message.includes('Invalid token')
      ) {
        clearTokens()
        window.dispatchEvent(new CustomEvent('auth:token-expired'))
      }
    }
  }
})

const retryLink = new RetryLink({
  delay: { initial: 500, max: 5000, jitter: true },
  attempts: { max: 3 },
})

const httpLink = new HttpLink({
  uri: '/graphql',
  credentials: 'same-origin',
})

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([authLink, errorLink, retryLink, httpLink]),
})
