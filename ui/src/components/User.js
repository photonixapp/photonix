import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'

import { getActiveLibrary } from '../stores/libraries/selector'
import accountCircle from '../static/images/account_circle.svg'
import arrowDown from '../static/images/arrow_down.svg'
import library from '../static/images/library.svg'
import settings from '../static/images/settings.svg'
import logout from '../static/images/logout.svg'
import '../static/css/Header.css'

function useComponentVisible(initialIsVisible) {
  const [isComponentVisible, setIsComponentVisible] = useState(
    initialIsVisible
  );
  const ref = useRef(null);

  const handleHideDropdown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsComponentVisible(false);
    }
  };

  const handleClickOutside = event => {
    if (ref.current && !ref.current.contains(event.target)) {
      setIsComponentVisible(false);
    }
  };
  useEffect(() => {
    document.addEventListener("keydown", handleHideDropdown, false);
    document.addEventListener("click", handleClickOutside, false);
    return () => {
      document.removeEventListener("keydown", handleHideDropdown, true);
      document.removeEventListener("click", handleClickOutside, true);
    };
  });

  return { ref, isComponentVisible, setIsComponentVisible };
}
const User = ({ profile, libraries }) => {
  const dispatch = useDispatch()
  const activeLibrary = useSelector(getActiveLibrary)
  const {
    ref,
    isComponentVisible,
    setIsComponentVisible
  } = useComponentVisible(false);
  
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
    setIsComponentVisible(true)
  }


  return (
    <div ref={ref} className="user" onClick={handleShowMenu} onMouseEnter={handleShowMenu}>
      <img src={accountCircle} alt="User account" />
      <img src={arrowDown} className="arrowDown" alt="" />
      <ul className="menu" style={{display: isComponentVisible ? 'block' : 'none'}}>
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
