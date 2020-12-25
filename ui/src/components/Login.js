import React from 'react'
import { useMutation, useQuery } from '@apollo/react-hooks'
import { Redirect } from 'react-router-dom'
import gql from 'graphql-tag'
import {SIGN_IN} from '../graphql/onboarding'
import { logIn, scheduleTokenRefresh } from '../auth'
import '../static/css/Login.css'

const ENVIRONMENT = gql`
  {
    environment {
      demo
      firstRun
      form 
      userId
      libraryId
      libraryPathId
    }
  }
`
const AUTH_USER = gql`
  mutation TokenAuth($username: String!, $password: String!) {
    tokenAuth(username: $username, password: $password) {
      token
      refreshToken
    }
  }
`

const Login = props => {
  let inputUsername, inputPassword
  const { data: envData } = useQuery(ENVIRONMENT)
  const { data: signInData } = useQuery(SIGN_IN)
  const [authUser, { data: authData, loading: authLoading, error: authError }] = useMutation(AUTH_USER)
  if (envData && envData.environment.form === "has_config_persional_info") {
    return <Redirect to="/onboarding" />
  }
  if (envData && envData.environment.form === "has_created_library") {
    return <Redirect to="/onboarding/step3" />
  }
  if (envData && envData.environment.form === "has_configured_importing") {
    return <Redirect to="/onboarding/step4" />
  }
  if (envData && envData.environment.form === "has_configured_image_analysis") {
    return <Redirect to="/onboarding/step5" />
  }

  if ((authData && authData.tokenAuth)) {
    logIn(authData.tokenAuth.refreshToken)
    scheduleTokenRefresh() // We don't have the token expiry from the tokenAuth mutation but this will start the refresh cycle off in a few seconds
    return <Redirect to="/" />
  }
  if(localStorage.getItem("isSignin") === "true" && signInData && signInData.afterSignup.token ) {
    localStorage.setItem("isSignin", true);
    logIn(signInData.afterSignup.token.refreshToken)
    scheduleTokenRefresh() // We don't have the token expiry from the tokenAuth mutation but this will start the refresh cycle off in a few seconds
    return <Redirect to="/" />
  }

  return (
    <>
      <div className="LoginForm">
        {authLoading && <p>Loading...</p>}
        {authError && <p>{authError.message}</p>}
        {authData && authData.errors && <p>{authData.errors}</p>}
        <form
          onSubmit={e => {
            e.preventDefault()
            authUser({
              variables: {
                username: inputUsername.value,
                password: inputPassword.value,
              },
            }).catch(e => {})
            inputUsername.value = ''
            inputPassword.value = ''
          }}
        >
          <label>Username: </label>
          <input
            type="text"
            ref={node => {
              inputUsername = node
            }}
            defaultValue={envData && envData.environment.demo ? 'demo' : '' }
          />
          <label>Password: </label>
          <input
            type="password"
            ref={node => {
              inputPassword = node
            }}
            defaultValue={envData && envData.environment.demo ? 'demo' : '' }
          />
          <button type="submit" style={{ cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
    </>
  )
}

export default Login
