import React, { useRef, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import styled from '@emotion/styled'

import User from './User'
import Notification from './Notification'
import { getIsMobileApp, getSafeArea } from '../stores/layout/selector'
import { ReactComponent as Logo } from '../static/images/logo.svg'
import { ReactComponent as MenuIcon } from '../static/images/menu.svg'

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
`
export const useComponentVisible = (initialIsVisible, type) => {
  const [isComponentVisible, setIsComponentVisible] = useState(initialIsVisible)
  const ref = useRef(null)

  const handleHideDropdown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsComponentVisible(false)
    }
  }

  const handleClickOutside = (event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setIsComponentVisible(false)
    }
  }
  useEffect(() => {
    document.addEventListener('keydown', handleHideDropdown, false)
    document.addEventListener('click', handleClickOutside, false)
    return () => {
      document.removeEventListener('keydown', handleHideDropdown, true)
      document.removeEventListener('click', handleClickOutside, true)
    }
  })

  return { ref, isComponentVisible, setIsComponentVisible }
}

const Header = ({ profile, libraries }) => {
  const isMobileApp = useSelector(getIsMobileApp)
  const safeArea = useSelector(getSafeArea)
  const [showNotification, setShowNotification] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
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
      <Notification
        showNotification={showNotification}
        setShowNotification={setShowNotification}
        setShowUserMenu={setShowUserMenu}
      />
      <User
        profile={profile}
        libraries={libraries}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        setShowNotification={setShowNotification}
      />
    </Container>
  )
}

export default Header
