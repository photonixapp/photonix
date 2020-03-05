import React from 'react'
import history from '../history'
import { logOut } from '../auth'

const Logout = props => {
  logOut()

  setTimeout(() => {
    history.push('/login')
  }, 2000)

  return (
    <>
      <div className="LoggedOut">
        <h1>Logged out</h1>
      </div>
      <style jsx>{`
        .LoggedOut {
          background: #292929;
          width: 400px;
          margin: 80px auto;
          padding: 40px;
        }
        .LoggedOut h1 {
          text-align: center;
          margin: 0;
        }
      `}</style>
    </>
  )
}

export default Logout
