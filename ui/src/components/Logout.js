import React from 'react'

import history from '../history'
import { logOut } from '../auth'
import '../static/css/Logout.css'

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
    </>
  )
}

export default Logout
