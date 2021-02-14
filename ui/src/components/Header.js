import React from 'react'
import User from './User'

import logo from '../static/images/logo.svg'
import notifications from '../static/images/notifications.svg'
import '../static/css/Header.css'

const Header = ({ profile, libraries }) => {
  return (
    <>
      <header className="flex-container-row">
        <div className="logo">
          <img src={logo} alt="Photonix Logo" />
          Photonix
        </div>
        <div className="navigation"></div>
        <div className="notifications">
          <img src={notifications} alt="Notifications" />
        </div>
        <User profile={profile} libraries={libraries} />
      </header>
    </>
  )
}

export default Header
