import history from './history'
import Cookies from 'js-cookie'

import { store } from './components/Init'

const TOKEN_EXPIRY_PREEMPT = 2 * 60 * 1000 // Refresh token this many milliseconds before expiry time
const DEFAULT_REFRESH_INTERVAL = 3 * 1000 // Only used on first login, when we don't get given an expiry time (ms)
const ERROR_REFRESH_INTERVAL = 15 * 1000 // Used as fixed retry interval when we can't refresh token (ms)

let timeout = null
export let loggedIn = false

export const refreshToken = () => {
  let oldRefreshToken = Cookies.get('refreshToken')

  if (!oldRefreshToken) {
    history.push('/login')
    return false
  }

  if (!loggedIn) {
    return false
  }

  fetch('/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    token
    refreshToken
    payload
  }
}`,
      variables: {
        refreshToken: oldRefreshToken,
      },
    }),
  })
    .then((response) => {
      return response.json()
    })
    .then((response) => {
      if (response.data && response.data.refreshToken) {
        // We got token and refreshToken
        Cookies.set('refreshToken', response.data.refreshToken.refreshToken, {
          expires: 365,
          sameSite: 'strict',
        })
        store.dispatch({
          type: 'USER_CHANGED',
          user: { username: response.data.refreshToken.payload.username },
        })

        // Schedule next token refresh
        let expiry = response.data.refreshToken.payload.exp
        let nextRefresh = expiry * 1000 - Date.now() - TOKEN_EXPIRY_PREEMPT
        scheduleTokenRefresh(nextRefresh)
      } else if (response.errors) {
        // Log all GraphQL errors
        response.errors.forEach(({ message, locations, path }) => {
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          )
          // refreshToken expired or some other problem
          if (
            message.indexOf('Refresh token is expired') > -1 ||
            message.indexOf('Invalid refresh token') > -1
          ) {
            history.push('/login')
            return false
          }
        })
        // All other GraphQL errors, assume server problem and shedule a new refresh
        console.log('Received GraphQL error')
        scheduleTokenRefresh(ERROR_REFRESH_INTERVAL)
      } else {
        // All other conditions, assume server problem and shedule a new refresh
        console.log("Didn't receive fresh token")
        scheduleTokenRefresh(ERROR_REFRESH_INTERVAL)
      }
    })
    .catch(function (error) {
      // All other errors, assume network issue and shedule a new refresh
      console.log('Network error while refreshing token')
      scheduleTokenRefresh(ERROR_REFRESH_INTERVAL)
    })
}

export const scheduleTokenRefresh = (timeout) => {
  // timeout is ms until next refresh attempt
  // Note that old refresh token will be automatically revoked by Django signal (one time use)
  let nextRefresh = timeout ? timeout : DEFAULT_REFRESH_INTERVAL
  console.log('Next token refresh in ' + nextRefresh + 'ms')
  timeout = setTimeout(refreshToken, nextRefresh)
}

export const revokeRefreshToken = (refreshToken) => {
  // This only needs to be called on logout as old refresh tokens get automatically revoked by Django signal (one time use)
  console.log('revokeRefreshToken ' + refreshToken)

  fetch('/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation RevokeToken($refreshToken: String!) {
  revokeToken(refreshToken: $refreshToken) {
    revoked
  }
}`,
      variables: {
        refreshToken: refreshToken,
      },
    }),
  })
    .then((response) => {
      return response.json()
    })
    .then((response) => {
      console.log(response.data)
      if (response.data.revokeToken) {
        return true
      }
    })
}

export const logIn = (refreshToken) => {
  if (refreshToken) {
    Cookies.set('refreshToken', refreshToken, {
      expires: 365,
      sameSite: 'strict',
    })
  }
  loggedIn = true
}

export const logOut = () => {
  loggedIn = false
  let oldToken = Cookies.get('refreshToken')
  if (oldToken) {
    revokeRefreshToken(oldToken)
    Cookies.remove('refreshToken')
  }
  if (timeout) {
    clearTimeout(timeout)
  }
}
