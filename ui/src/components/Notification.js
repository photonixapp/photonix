import React, { useState, useEffect } from 'react'
import styled from '@emotion/styled'
import { Progress, Box, Flex } from '@chakra-ui/core'
import { useQuery, useMutation } from '@apollo/client'
import { useSelector } from 'react-redux'

import notifications from '../static/images/notifications.svg'
import play from '../static/images/play.svg'
import pause from '../static/images/pause.svg'
import { GET_TASK_PROGRESS } from '../graphql/settings'
import { getActiveLibrary } from '../stores/libraries/selector'
import { useComponentVisible } from './Header'
import { useSettings } from './Settings'
import {
  SETTINGS_STYLE,
  SETTINGS_COLOR,
  SETTINGS_LOCATION,
  SETTINGS_OBJECT,
  SETTINGS_FACE,
  GET_SETTINGS,
} from '../graphql/settings'

const Container = styled('div')`
  margin-right: 10px;
  > img {
    filter: invert(0.9);
    padding: 10px 0 10px 10px;
    width: 50px;
    height: 50px;
    cursor: pointer;
  }
  .notificationMenu {
    position: absolute;
    width: 400px;
    right: 0px;
    top: 50px;
    z-index: 10;
    background: #484848;
    margin: 0;
    list-style: none;
    padding: 0;
    box-shadow: -3px 8px 17px rgba(0, 0, 0, 0.15);
  }
  .isMobileApp header .notificationMenu {
    top: 80px;
  }
  .notificationMenu li {
    padding: 12px 15px 12px 15px;
    cursor: default;
    font-size: 16px;
  }
  .notificationMenu li:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .notificationMenu li img {
    padding: 0;
    width: 35px;
    height: 35px;
    vertical-align: -6px;
    margin-right: 10px;
    filter: invert(0.9);
    cursor: pointer;
  }
  @media (max-width: 767px) {
    .notificationMenu {
      width: 290px;
    }
    .notificationMenu li {
      font-size: 13px;
    }
  }
`
const Notification = (props) => {
  const activeLibrary = useSelector(getActiveLibrary)
  const [settings, setSettings] = useSettings(activeLibrary)
  const [showNotificationIcon, setShowNotificationIcon] = useState(false)
  const {
    ref,
    isComponentVisible,
    setIsComponentVisible,
  } = useComponentVisible(false)
  const { showNotification, setShowNotification, setShowUserMenu } = props

  const handleShowMenu = () => {
    if (!isComponentVisible) {
      setIsComponentVisible(true)
      setShowNotification(true)
      setShowUserMenu(false)
      settingsRefetch()
    } else {
      setIsComponentVisible(false)
    }
  }

  const { data, refetch } = useQuery(GET_TASK_PROGRESS)
  const { refetch: settingsRefetch } = useQuery(GET_SETTINGS, {
    variables: { libraryId: activeLibrary?.id },
  })
  const [settingUpdateStyle] = useMutation(SETTINGS_STYLE)
  const [settingUpdateColor] = useMutation(SETTINGS_COLOR)
  const [settingUpdateLocation] = useMutation(SETTINGS_LOCATION)
  const [settingUpdateObject] = useMutation(SETTINGS_OBJECT)
  const [settingUpdateFace] = useMutation(SETTINGS_FACE)

  useEffect(() => {
    const interval = isComponentVisible ? 3000 : 15000
    let handle = setInterval(refetch, interval)
    return () => {
      clearInterval(handle)
    }
  })

  useEffect(() => {
    if (!isComponentVisible) setShowNotification(false)
  }, [isComponentVisible, setShowNotification])

  useEffect(() => {
    if (data) {
      getKeys(data).map((key) => {
        let remaining = data.taskProgress[key]?.remaining
        if (remaining === 0) {
          window.sessionStorage.setItem(key, 0)
        } else if (remaining > window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, remaining)
          !showNotificationIcon && setShowNotificationIcon(true)
        }
        return key
      })
    }
  }, [data, showNotificationIcon])

  const getTitle = (key) => {
    switch (key) {
      case 'generateThumbnails':
        return 'Generating thumbnails'
      case 'processRaw':
        return 'Processing raw files'
      case 'classifyColor':
        return 'Analyzing colors'
      case 'classifyObject':
        return 'Analyzing objects'
      case 'classifyLocation':
        return 'Analyzing locations'
      case 'classifyStyle':
        return 'Analyzing styles'
      case 'classifyFace':
        return 'Analyzing faces'
      default:
        return ''
    }
  }

  const getKeys = (data) => {
    let keys = Object.keys(data.taskProgress)
    return keys
  }

  const getNotificationKeys = (data) => {
    const keys = getKeys(data)
    const remaining = keys.filter((k) => data.taskProgress[k].remaining > 0)
    if (remaining.length) {
      !showNotificationIcon && setShowNotificationIcon(true)
    } else {
      showNotificationIcon && setShowNotificationIcon(false)
      isComponentVisible && setIsComponentVisible(false)
    }
    return remaining
  }

  const getProgressPercent = (key) => {
    return (
      ((window.sessionStorage.getItem(key) -
        data.taskProgress[key]?.remaining) /
        window.sessionStorage.getItem(key)) *
      100
    )
  }

  const getSettingsKey = (key) => {
    switch (key) {
      case 'classifyObject':
        return 'classificationObjectEnabled'
      case 'classifyColor':
        return 'classificationColorEnabled'
      case 'classifyLocation':
        return 'classificationLocationEnabled'
      case 'classifyStyle':
        return 'classificationStyleEnabled'
      case 'classifyFace':
        return 'classificationFaceEnabled'
      default:
        return null
    }
  }

  const toggleBooleanSetting = (key) => {
    let newSettings = { ...settings }
    newSettings[getSettingsKey(key)] = !settings[getSettingsKey(key)]
    setSettings(newSettings)
    switch (getSettingsKey(key)) {
      case 'classificationStyleEnabled':
        settingUpdateStyle({
          variables: {
            classificationStyleEnabled: newSettings.classificationStyleEnabled,
            libraryId: activeLibrary?.id,
          },
        }).catch((e) => {})
        return key
      case 'classificationLocationEnabled':
        settingUpdateLocation({
          variables: {
            classificationLocationEnabled:
              newSettings.classificationLocationEnabled,
            libraryId: activeLibrary?.id,
          },
        }).catch((e) => {})
        return key
      case 'classificationObjectEnabled':
        settingUpdateObject({
          variables: {
            classificationObjectEnabled:
              newSettings.classificationObjectEnabled,
            libraryId: activeLibrary?.id,
          },
        }).catch((e) => {})
        return key
      case 'classificationColorEnabled':
        settingUpdateColor({
          variables: {
            classificationColorEnabled: newSettings.classificationColorEnabled,
            libraryId: activeLibrary?.id,
          },
        }).catch((e) => {})
        return key
      case 'classificationFaceEnabled':
        settingUpdateFace({
          variables: {
            classificationFaceEnabled: newSettings.classificationFaceEnabled,
            libraryId: activeLibrary?.id,
          },
        }).catch((e) => {})
        return key
      default:
        return null
    }
  }

  const getRemaining = (remaining, totalRunning) => {
    return remaining === '0'
      ? '1'
      : Math.abs(parseInt(remaining) - parseInt(totalRunning))
  }

  const getTotalRunning = (remaining, totalRunning) => {
    return totalRunning === '0' ? remaining : totalRunning
  }

  return (
    <>
      {showNotificationIcon ? (
        <Container ref={ref} onClick={handleShowMenu}>
          <img src={notifications} alt="Notification" />
          <ul
            className="notificationMenu"
            style={{ display: showNotification ? 'block' : 'none' }}
          >
            {data
              ? getNotificationKeys(data).map((key, index) => (
                  <li key={index}>
                    <Flex color="white" align="center">
                      <Box flex="1">
                        <Flex mb="1">
                          <Box flex="1">{getTitle(key)}</Box>
                          <Box width="80px" textAlign="right">
                            {getRemaining(
                              data.taskProgress[key]?.remaining,
                              window.sessionStorage.getItem(key)
                            )}
                            /
                            {getTotalRunning(
                              data.taskProgress[key]?.remaining,
                              window.sessionStorage.getItem(key)
                            )}
                          </Box>
                        </Flex>
                        <Progress
                          value={getProgressPercent(key)}
                          color="teal"
                          height="6px"
                          roundedRight="6px"
                        />
                      </Box>
                      <Box ml="2" width="35px">
                        {key !== 'generateThumbnails' &&
                        key !== 'processRaw' ? (
                          settings[getSettingsKey(key)] ? (
                            <img
                              src={pause}
                              onClick={() => toggleBooleanSetting(key)}
                              alt="pause"
                            />
                          ) : (
                            <img
                              src={play}
                              onClick={() => toggleBooleanSetting(key)}
                              alt="play"
                            />
                          )
                        ) : null}
                      </Box>
                    </Flex>
                  </li>
                ))
              : null}
          </ul>
        </Container>
      ) : null}
    </>
  )
}

export default Notification
