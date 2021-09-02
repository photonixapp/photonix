import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import styled from '@emotion/styled'

import { getActiveLibrary } from '../stores/libraries/selector'
import { useComponentVisible } from './Header'
import { ReactComponent as AccountCircleIcon } from '../static/images/account_circle.svg'
import { ReactComponent as MoreVertIcon } from '../static/images/more_vert.svg'
import { ReactComponent as LibraryIcon } from '../static/images/library.svg'
import { ReactComponent as SettingsIcon } from '../static/images/settings.svg'
import { ReactComponent as LogoutIcon } from '../static/images/logout.svg'

const Container = styled('div')`
  > svg {
    filter: invert(0.9);
    padding: 10px;
    width: 50px;
    height: 50px;
    cursor: pointer;
  }
  .arrowDown {
    width: 34px;
    padding: 10px 10px 10px 0;
  }

  .notifications svg,
  .userMenu {
    position: absolute;
    width: 200px;
    right: 0px;
    top: 50px;
    z-index: 10;
    background: #444;
    margin: 0;
    list-style: none;
    padding: 0;
    box-shadow: -3px 8px 17px rgba(0, 0, 0, 0.15);
  }
  .isMobileApp header .userMenu {
    top: 80px;
  }
  .userMenu li {
    padding: 12px 15px 12px 15px;
    cursor: default;
    display: flex;
  }
  .userMenu li:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .userMenu a,
  .userMenu a li,
  .userMenu li.library {
    cursor: pointer;
    color: #ddd;
    text-decoration: none;
  }
  .userMenu a:hover li {
    color: #fff;
  }
  .userMenu li svg {
    padding: 0;
    width: 24px;
    height: 24px;
    vertical-align: -6px;
    margin-right: 10px;
    filter: invert(0.9);
  }
  .userMenu li .text {
    flex: 1;
    align-self: center;
    margin-top: 1px;
  }
  .userMenu li.profile svg {
    width: 32px;
    height: 32px;
    margin-left: -4px;
    margin-right: 6px;
    vertical-align: -4px;
  }
  .userMenu li.profile div {
    display: inline-block;
    width: 100px;
  }
  .userMenu li.profile div .username {
    font-weight: 600;
    line-height: 18px;
    display: block;
  }
  .userMenu li.profile div .email {
    font-size: 10px;
    line-height: 12px;
    display: block;
  }

  .activeLibrary {
    height: 10px;
    width: 10px;
    background-color: rgb(0, 168, 161);
    border-radius: 100%;
    float: right;
    margin: 8px 0 0 0;
  }
  .inactiveLibrary {
    width: 10px;
  }
`

const User = ({
  profile,
  libraries,
  showUserMenu,
  setShowUserMenu,
  setShowNotification,
}) => {
  const dispatch = useDispatch()
  const activeLibrary = useSelector(getActiveLibrary)
  const {
    ref,
    isComponentVisible,
    setIsComponentVisible,
  } = useComponentVisible(false)

  const isActiveLibrary = (id) => {
    return activeLibrary?.id === id
  }

  const updateActiveLib = (lib) => {
    dispatch({
      type: 'SET_ACTIVE_LIBRARY',
      payload: lib,
    })
  }

  const handleShowMenu = () => {
    if (!isComponentVisible) {
      setIsComponentVisible(true)
      setShowUserMenu(true)
      setShowNotification(false)
    } else {
      setIsComponentVisible(false)
    }
  }

  useEffect(() => {
    if (!isComponentVisible) setShowUserMenu(false)
  }, [isComponentVisible, setShowUserMenu])

  return (
    <Container ref={ref} onClick={handleShowMenu}>
      <MoreVertIcon />
      <ul
        className="userMenu"
        style={{ display: showUserMenu ? 'block' : 'none' }}
      >
        {profile ? (
          <Link to="/account">
            <li className="profile">
              <AccountCircleIcon />{' '}
              <div className="text">
                <span className="username">{profile.username}</span>
                <span className="email">{profile.email}</span>
              </div>
            </li>
          </Link>
        ) : null}
        {libraries
          ? libraries.map((lib) => (
              <li
                key={lib.id}
                onClick={() => updateActiveLib(lib)}
                className="library"
              >
                <LibraryIcon />
                <div className="text">{lib.name}</div>
                {isActiveLibrary(lib.id) ? (
                  <span className="activeLibrary"></span>
                ) : (
                  <span className="inactiveLibrary"></span>
                )}
              </li>
            ))
          : null}
        <Link to="/settings">
          <li>
            <SettingsIcon />
            <div className="text">Settings</div>
          </li>
        </Link>
        <Link to="/logout">
          <li>
            <LogoutIcon />
            <div className="text">Logout</div>
          </li>
        </Link>
      </ul>
    </Container>
  )
}

User.propTypes = {
  profile: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
  }),
  libraries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    })
  ),
}

export default User
