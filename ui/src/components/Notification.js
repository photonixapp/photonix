import React, { useRef, useState, useEffect } from 'react'
import styled from '@emotion/styled'
import { Progress, Box, Flex } from "@chakra-ui/core"
import { useQuery, useMutation } from '@apollo/react-hooks'
import { useSelector } from 'react-redux'

import notifications from '../static/images/notifications.svg'
import play from '../static/images/play.svg'
import pause from '../static/images/pause.svg'
import { GET_TASK_PROGRESS } from '../graphql/settings'
import { getActiveLibrary } from '../stores/libraries/selector'
import { useComponentVisible } from './User'
import { useSettings } from './Settings'
import {
  SETTINGS_STYLE,
  SETTINGS_COLOR,
  SETTINGS_LOCATION,
  SETTINGS_OBJECT,
  GET_SETTINGS
} from '../graphql/settings'

const Container = styled('div')`
  margin-right:10px;
    > img {
    filter: invert(0.9);
    padding: 10px 0 10px 10px;
    width: 50px;
    height: 50px;
    cursor: pointer;
  }
  .userMenu {
    position: absolute;
    width: 290px;
    right: 0px;
    top: 50px;
    z-index: 10;
    background: #484848;
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
    // display: flex;
    margin-bottom: 20px;
  }
  .userMenu li:last-child {
    margin-bottom: 10px;
  }
  .userMenu li:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .userMenu li img {
    padding: 0;
    width: 35px;
    height: 35px;
    vertical-align: -6px;
    margin-right: 10px;
    filter: invert(0.9);
    cursor: pointer;
  }
`
const Notification = () => {
  const activeLibrary = useSelector(getActiveLibrary)
  const [settings, setSettings] = useSettings(activeLibrary)
  const [showNotificationIcon, setShowNotificationIcon] = useState(true)
  const [firstRun, setFirstRun] = useState(true)
  const {
    ref,
    isComponentVisible,
    setIsComponentVisible,
  } = useComponentVisible(false)
  const handleShowMenu = () => {
    if (!isComponentVisible) {
      setIsComponentVisible(true)
      settingsRefetch()
    }
  }
  const { data, refetch } = useQuery(GET_TASK_PROGRESS)
  const { data: settingsData, refetch: settingsRefetch } = useQuery(GET_SETTINGS, {
    variables: { libraryId: activeLibrary?.id },
  })
  const [settingUpdateStyle] = useMutation(SETTINGS_STYLE)
  const [settingUpdateColor] = useMutation(SETTINGS_COLOR)
  const [settingUpdateLocation] = useMutation(SETTINGS_LOCATION)
  const [settingUpdateObject] = useMutation(SETTINGS_OBJECT)

  const getTitle = key => {
    switch(key) {
      case 'generateThumbnails':
        return 'Generating thumbnails'
      case 'processRaw':
        return 'Processing raw files'
      case 'classifyColor':
        return 'Analysing colors'
      case 'classifyObject':
        return 'Analysing objects'
      case 'classifyLocation':
        return 'Analysing locations'
      case 'classifyStyle':
        return 'Analysing styles'
      default:
        return '';
    }
  }
  
  const getKeys = (data) => {
    let keys = Object.keys(data.taskProgress)
    keys.splice(keys.length-1)
    return keys
  }
  
  useEffect(() => {
    if (data && firstRun) {
      getKeys(data).map(key => {
        if (data.taskProgress[key]?.total > 0)
          window.sessionStorage.setItem(key, data.taskProgress[key]?.total)
      })
      setFirstRun(false)
    }
  }, [data, firstRun])
  
  const refetchTasks = () => {
    refetch()
    if (data && !firstRun) {
      getKeys(data).map(key => {
        const sessionVal = window.sessionStorage.getItem(key)
        const remaining = data.taskProgress[key]?.remaining
        if (remaining > sessionVal) {
          window.sessionStorage.setItem(key, data.taskProgress[key]?.total)
        } else if(remaining === 0) {
          window.sessionStorage.setItem(key, 0)
        }
      })
    }
  }
  useEffect(() => {
    let handle = setInterval(refetchTasks, 60000)
    return () => {
      clearInterval(handle)
    }
  })

  const getNotificationKeys = (data) =>{
    const keys = getKeys(data)
    const remaining = keys.filter(k => data.taskProgress[k].remaining > 0)
    if (remaining.length) {
      !showNotificationIcon && setShowNotificationIcon(true)
     } else {
      showNotificationIcon && setShowNotificationIcon(false)
     } 
    return remaining
  }
 
  const getProgressPercent = key => {
    return ((window.sessionStorage.getItem(key) - data.taskProgress[key]?.remaining) / window.sessionStorage.getItem(key)) * 100
  }
  const getSettingsKey = key => {
    switch(key) {
      case 'classifyObject':
        return 'classificationObjectEnabled'
      case 'classifyColor':
        return 'classificationColorEnabled'
      case 'classifyLocation':
        return 'classificationLocationEnabled'
      case 'classifyStyle':
        return 'classificationStyleEnabled'
      default:
        return null
    }
  }

  const getSetting = key => {
    switch(key) {
      case 'classifyObject':
        return settings.classificationObjectEnabled
      case 'classifyColor':
        return settings.classificationColorEnabled
      case 'classifyLocation':
        return settings.classificationLocationEnabled
      case 'classifyStyle':
        return settings.classificationStyleEnabled
      default:
        return ''
    }
  }
  const toggleBooleanSetting = key => {
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
      default:
        return null
    }
  }

  return (
    <>
    {showNotificationIcon ?
      <Container ref={ref} onClick={handleShowMenu} onMouseEnter={handleShowMenu}>
        <img src={notifications} alt="Notification" />
        <ul
          className="userMenu"
          style={{ display: isComponentVisible ? 'block' : 'none' }}
        >
          {data?
            getNotificationKeys(data).map((key, index) => (
              <li key={index}>
                <Flex color="white" align="center">
                  <Box flex="1">
                    <Flex mb="1">
                      <Box flex="1" fontSize={14}>{getTitle(key)}</Box>
                      <Box width="80px" fontSize={14} textAlign="right">
                        {data.taskProgress[key]?.total-data.taskProgress[key]?.remaining}/{data.taskProgress[key]?.total}
                      </Box>
                    </Flex>
                    <Progress value={getProgressPercent(key)} color="teal" height="6px" roundedRight="6px" />
                  </Box>
                  <Box ml="2" width="35px" >
                    {key !== 'generateThumbnails' && key !== 'processRaw' ?
                      settings[getSettingsKey(key)] ?
                      <img src={pause} onClick={() => toggleBooleanSetting(key)} />
                      :
                      <img src={play} onClick={() => toggleBooleanSetting(key)} />
                      :
                      null
                    }
                  </Box>
                </Flex>
              </li>
            ))
          : null}
        </ul>
      </Container>
    : null }
    </>
  )
}

export default Notification
