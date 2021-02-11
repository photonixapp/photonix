import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { getActiveLibrary } from '../stores/library/selector'
import accountCircle from '../static/images/account_circle.svg'
import arrowDown from '../static/images/arrow_down.svg'
import library from '../static/images/library.svg'
import settings from '../static/images/settings.svg'
import logout from '../static/images/logout.svg'
import '../static/css/Header.css'

const User = ({ profile, libraries }) => {
  const dispatch = useDispatch()
  const activeLibrary = useSelector(getActiveLibrary)

  const isActiveLibrary = (id) => {
    return activeLibrary?.id === id
  }

  const updateActiveLib = (lib) => {
    dispatch({
      type: 'SET_ACTIVE_LIBRARY',
      payload: lib,
    })
  }
  return (
    <div className="user">
      <img src={accountCircle} alt="User account" />
      <img src={arrowDown} className="arrowDown" alt="" />
      <ul className="menu">
        {profile ? (
          <Link to="/account">
            <li className="profile">
              <img src={accountCircle} alt="Settings" />{' '}
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
                <img src={library} alt="Library" />
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
            <img src={settings} alt="Settings" />
            <div className="text">Settings</div>
          </li>
        </Link>
        <Link to="/logout">
          <li>
            <img src={logout} alt="Logout" />
            <div className="text">Logout</div>
          </li>
        </Link>
      </ul>
    </div>
  )
}

export default User
