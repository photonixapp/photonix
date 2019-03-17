import React from 'react'
import accountCircle from '../static/images/account_circle.svg'
import arrowDown from '../static/images/arrow_down.svg'
import notifications from '../static/images/notifications.svg'
import settings from '../static/images/settings.svg'
import '../static/css/Header.css'

const Header = ({onShowSettings}) => {
  return (
    <>
      <header className="flex-container-row">
        <div className="logo">Photonix</div>
        <div className="navigation"></div>
        <div className="notifications"><img src={notifications} alt="Notifications" /></div>
        <div className="user">
          <img src={accountCircle} alt="User account" />
          <img src={arrowDown} className="arrowDown" />
          <ul className="menu">
            <li onClick={onShowSettings}><img src={settings} /> Settings</li>
          </ul>
        </div>
      </header>
    </>
  )
}

export default Header
