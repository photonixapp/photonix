import React from 'react'
import { Link } from 'react-router-dom'
import accountCircle from '../static/images/account_circle.svg'
import arrowDown from '../static/images/arrow_down.svg'
import notifications from '../static/images/notifications.svg'
import settings from '../static/images/settings.svg'
import logout from '../static/images/logout.svg'
import '../static/css/Header.css'

const Header = () => {
  return (
    <>
      <header className="flex-container-row">
        <div className="logo">Photonix</div>
        <div className="navigation"></div>
        <div className="notifications">
          <img src={notifications} alt="Notifications" />
        </div>
        <div className="user">
          <img src={accountCircle} alt="User account" />
          <img src={arrowDown} className="arrowDown" alt="" />
          <ul className="menu">
            <Link to="/settings">
              <li>
                <img src={settings} alt="Settings" /> Settings
              </li>
            </Link>
            <Link to="/logout">
              <li>
                <img src={logout} alt="Logout" /> Logout
              </li>
            </Link>
          </ul>
        </div>
      </header>
    </>
  )
}

export default Header
