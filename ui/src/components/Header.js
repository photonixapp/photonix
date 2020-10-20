import React from 'react'
import { Link } from 'react-router-dom'

import accountCircle from '../static/images/account_circle.svg'
import arrowDown from '../static/images/arrow_down.svg'
import notifications from '../static/images/notifications.svg'
import library from '../static/images/library.svg'
import settings from '../static/images/settings.svg'
import logout from '../static/images/logout.svg'
import '../static/css/Header.css'

const Header = ({ profile, libraries }) => (
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
          {profile ? (
            <li className="profile">
              <img src={accountCircle} alt="Settings" />{' '}
              <div>
                <span className="username">{profile.username}</span>
                <span className="email">{profile.email}</span>
              </div>
            </li>
          ) : null}
          {libraries
            ? libraries.map(({ id, name }) => (
                <li key={id}>
                  <img src={library} alt="Settings" /> {name}
                </li>
              ))
            : null}
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

export default Header
