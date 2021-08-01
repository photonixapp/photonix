import React from 'react'
import { useSelector } from 'react-redux'
import styled from '@emotion/styled'

import User from './User'
import { getIsMobileApp, getSafeArea } from '../stores/layout/selector'
import { ReactComponent as Logo } from '../static/images/logo.svg'
import { ReactComponent as MenuIcon } from '../static/images/menu.svg'
// import notifications from '../static/images/notifications.svg'

const Container = styled('div')`
  height: 50px;
  flex: none;
  justify-content: space-between;
  background: #444;
  z-index: 20;

  > .logo {
    flex: none;
    font-size: 26px;
    font-weight: 400;
    margin: 10px;
    line-height: 1.2;
    color: #fff;
  }
  > .logo svg.menu {
    width: 30px;
    height: 30px;
    margin-right: 8px;
    vertical-align: top;
    position: relative;
    top: 0;
    filter: invert(0.9);
    background: none;
    display: none;
  }
  > .logo svg.logo {
    width: 30px;
    height: 30px;
    margin-right: 8px;
    vertical-align: top;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
  }
  .navigation {
    flex-grow: 1;
  }
  .notifications {
    width: 50px;
  }
`

const Header = ({ profile, libraries }) => {
  const isMobileApp = useSelector(getIsMobileApp)
  const safeArea = useSelector(getSafeArea)

  return (
    <Container
      className="flex-container-row"
      style={{ paddingTop: safeArea.top, height: 50 + safeArea.top }}
    >
      <div className="logo">
        <MenuIcon
          className="menu"
          alt="menu"
          style={{ display: isMobileApp ? 'inline' : 'none' }}
          onClick={() => window.photonix?.openAppMenu()}
        />
        <Logo className="logo" alt="Photonix Logo" />
        Photonix
      </div>
      <div className="navigation"></div>
      {/* <div className="notifications">
          <img src={notifications} alt="Notifications" />
        </div> */}
      <User profile={profile} libraries={libraries} />
    </Container>
  )
}

export default Header
