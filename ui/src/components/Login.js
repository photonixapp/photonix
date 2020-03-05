import React from 'react'
import { useMutation } from '@apollo/react-hooks'
import { Redirect } from 'react-router-dom'
import gql from 'graphql-tag'
import { logIn, scheduleTokenRefresh } from '../auth'

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
  const [authUser, { data, loading, error }] = useMutation(AUTH_USER)

  if (data && data.tokenAuth) {
    logIn(data.tokenAuth.refreshToken)
    scheduleTokenRefresh() // We don't have the token expiry from the tokenAuth mutation but this will start the refresh cycle off in a few seconds
    return <Redirect to="/" />
  }

  return (
    <>
      <div className="LoginForm">
        {loading && <p>Loading...</p>}
        {error && <p>{error.message}</p>}
        {data && data.errors && <p>{data.errors}</p>}
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
          />
          <label>Password: </label>
          <input
            type="password"
            ref={node => {
              inputPassword = node
            }}
          />
          <button type="submit" style={{ cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
      <style jsx>{`
        .LoginForm {
          background: #292929;
          width: 400px;
          margin: 80px auto;
          padding: 40px;
        }
        .LoginForm label {
          width: 120px;
          display: inline-block;
        }
        .LoginForm input {
          width: 200px;
          background: #484848;
          color: #fff;
          border: 0;
          padding: 11px 13px 9px 13px;
          margin-bottom: 10px;
        }
        .LoginForm button {
          background: #484848;
          color: #fff;
          border: 0;
          padding: 11px 13px 9px 13px;
          display: block;
          width: 100%;
          font-weight: 300;
          margin-top: 20px;
        }
      `}</style>
    </>
  )
}

export default Login
