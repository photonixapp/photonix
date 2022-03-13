import React from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Redirect } from 'react-router-dom'
import styled from '@emotion/styled'
import gql from 'graphql-tag'

import { SIGN_IN } from '../graphql/onboarding'
import { logIn, scheduleTokenRefresh } from '../auth'

const Container = styled('div')`
  background: #333;
  width: 400px;
  margin: 80px auto;
  padding: 40px;

  button {
    background: #444;
    color: #fff;
    border: 0;
    padding: 11px 13px 9px 13px;
    display: block;
    width: 100%;
    font-weight: 300;
    margin-top: 20px;
  }

  @media all and (max-width: 500px) {
    width: 100%;
  }
`

const Row = styled('div')`
  display: flex;
  align-items: baseline;

  label {
    min-width: 80px;
    display: inline-block;
  }

  input {
    flex: 1;
    background: #444;
    color: #fff;
    border: 0;
    padding: 11px 13px 9px 13px;
    margin-bottom: 10px;
  }
`

const ENVIRONMENT = gql`
  {
    environment {
      demo
      sampleData
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

const Login = (props) => {
  let inputUsername, inputPassword
  const { data: envData } = useQuery(ENVIRONMENT)
  const { data: signInData, error: signInError } = useQuery(SIGN_IN)
  if (signInError) {
    console.log('signInError')
  }
  const [
    authUser,
    { data: authData, loading: authLoading, error: authError },
  ] = useMutation(AUTH_USER)
  if (
    envData?.environment &&
    envData.environment.form === 'has_set_personal_info'
  ) {
    return <Redirect to="/onboarding" />
  }
  if (
    envData?.environment &&
    envData.environment.form === 'has_created_library'
  ) {
    return <Redirect to="/onboarding/step3" />
  }
  if (
    envData?.environment &&
    envData.environment.form === 'has_configured_importing'
  ) {
    return <Redirect to="/onboarding/step4" />
  }
  if (
    envData?.environment &&
    envData.environment.form === 'has_configured_image_analysis'
  ) {
    return <Redirect to="/onboarding/step5" />
  }

  if (authData && authData.tokenAuth) {
    logIn(authData.tokenAuth.refreshToken)
    scheduleTokenRefresh() // We don't have the token expiry from the tokenAuth mutation but this will start the refresh cycle off in a few seconds
    return <Redirect to="/" />
  }
  if (
    localStorage.getItem('isSignin') === 'true' &&
    signInData &&
    signInData.afterSignup.token
  ) {
    localStorage.setItem('isSignin', true)
    logIn(signInData.afterSignup.refreshToken)
    scheduleTokenRefresh() // We don't have the token expiry from the tokenAuth mutation but this will start the refresh cycle off in a few seconds
    return <Redirect to="/" />
  }

  return (
    <Container>
      {authLoading && <p>Loading...</p>}
      {authError && <p>{authError.message}</p>}
      {authData && authData.errors && <p>{authData.errors}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          authUser({
            variables: {
              username: inputUsername.value,
              password: inputPassword.value,
            },
          }).catch((e) => {})
          inputUsername.value = ''
          inputPassword.value = ''
        }}
      >
        <Row>
          <label>Username: </label>
          <input
            type="text"
            ref={(node) => {
              inputUsername = node
            }}
            defaultValue={
              envData?.environment &&
              (envData.environment.demo || envData.environment.sampleData)
                ? 'demo'
                : ''
            }
          />
        </Row>
        <Row>
          <label>Password: </label>
          <input
            type="password"
            ref={(node) => {
              inputPassword = node
            }}
            defaultValue={
              envData?.environment &&
              (envData.environment.demo || envData.environment.sampleData)
                ? 'demo'
                : ''
            }
          />
        </Row>
        <button type="submit" style={{ cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </Container>
  )
}

export default Login
