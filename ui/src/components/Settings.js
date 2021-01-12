import React, { useState, useEffect,useRef } from 'react'
import history from '../history'
import { useQuery,useMutation} from '@apollo/react-hooks';

import {
  Switch,
  Flex,
  Stack,
  Heading,
  FormLabel,
  Input,
  InputGroup,
  IconButton,
} from '@chakra-ui/core'

import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import '../static/css/Settings.css'
import {SETTINGS_STYLE,SETTINGS_COLOR,SETTINGS_LOCATION,SETTINGS_OBJECT,SETTINGS_SOURCE_FOLDER,GET_SETTINGS} from '../graphql/setting'
// import folder from '../static/images/folder.svg'

export default function Settings() {
  const [settings, setSettings] = useSettings()
  const availableSettings = [
    {
      key: 'sourceDirs',
      type: 'path',
      label: 'Source folder',
    },
    {
      key: 'watchPhotos',
      type: 'boolean',
      label: 'Watch folder for new photos',
    },
    {
      key: 'classificationColorEnabled',
      type: 'boolean',
      label: 'Run color analysis on photos?',
    },
    {
      key: 'classificationLocationEnabled',
      type: 'boolean',
      label: 'Run location detection on photos?',
    },
    {
      key: 'classificationStyleEnabled',
      type: 'boolean',
      label: 'Run style classification on photos?',
    },
    {
      key: 'classificationObjectEnabled',
      type: 'boolean',
      label: 'Run object detection on photos?',
    },
  ]

  function toggleBooleanSetting(key) {
    let newSettings = {...settings}
    newSettings[key] = !settings[key]
    setSettings(newSettings)
    switch(key) {
      case "classificationStyleEnabled":
        settingUpdateStyle({
          variables: {
            classificationStyleEnabled: newSettings.classificationStyleEnabled,
          },
        }).catch(e => {})
        return key
      case "classificationLocationEnabled":
        settingUpdateLocation({
          variables: {
            classificationLocationEnabled: newSettings.classificationLocationEnabled,
          },
        }).catch(e => {})
        return key
      case "classificationObjectEnabled":
        settingUpdateObject({
          variables: {
            classificationObjectEnabled: newSettings.classificationObjectEnabled,
          },
        }).catch(e => {})
        return key
      case "classificationColorEnabled":
        settingUpdateColor({
          variables: {
            classificationColorEnabled: newSettings.classificationColorEnabled,
          },
        }).catch(e => {})
        return key
      }
    }

  function onSelectSourceDir() {
    if (window.sendSyncToElectron) {
      let dirs = window.sendSyncToElectron('select-dir')
      setSettings({ sourceDirs: dirs })
    }
  }

  function onChangeSourceDir (e) {
    let newSettings = {...settings}
    newSettings.sourceDirs = e.currentTarget.value 
    setSettings(newSettings)
    settingUpdateSourceFolder({
      variables: {
        sourceFolder: newSettings.sourceDirs,
      },
    }).catch(e => {})
  }
  const [settingUpdateStyle] = useMutation(SETTINGS_STYLE)
  const [settingUpdateColor] = useMutation(SETTINGS_COLOR)
  const [settingUpdateLocation] = useMutation(SETTINGS_LOCATION)
  const [settingUpdateObject] = useMutation(SETTINGS_OBJECT)
  const [settingUpdateSourceFolder] = useMutation(SETTINGS_SOURCE_FOLDER)

  return (
    <div className="Settings">
      <span onClick={history.goBack}>
        <CloseIcon className="closeIcon" alt="Close" />
      </span>
      <h2>Settings</h2>
      <Stack spacing={4}>
        {availableSettings.map((item, index) => {
          let field = null

          if (settings) {
            if (item.type === 'path') {
              field = (
                <InputGroup size="sm">
                  <Input
                    rounded="0"
                    value={settings ? settings[item.key] : 'empty'}
                    onChange={ onChangeSourceDir}
                  />
                  <IconButton
                    aria-label="Select source folder"
                    icon="search"
                    onClick={onSelectSourceDir}
                  />
                </InputGroup>
              )
            } else if (item.type === 'boolean') {
              field = (
                <Switch
                  key={index}
                  id={item.key + 'New'}
                  isChecked={settings[item.key]}
                  onChange={() => toggleBooleanSetting(item.key)}
                  variantColor="cyan"
                />
              )
            }
          }

          return (
            <Flex justify="space-between" key={item.key + item.type}>
              <FormLabel htmlFor={item.key}>{item.label}</FormLabel>
              {field}
            </Flex>
          )
        })}
      </Stack>
    </div>
  )
}

const useSettings = () => {
  const [existingSettings, setSettings] = useState({})
  const  { loading, error, data,refetch }= useQuery(GET_SETTINGS)
  console.log(error)

  const isInitialMount = useRef(true);

  useEffect (() => {
    refetch()
    if (isInitialMount.current) {
      isInitialMount.current = false;
   } else{
    if(!loading) {
      let setting = data.librarySetting.library
      setting.sourceDirs = data.librarySetting.sourceFolder
      setSettings(setting)
    }
   } 
  },[data])


  useEffect(() => {
    refetch()
    if(!loading) {
      let setting = data.librarySetting.library
      setting.sourceDirs = data.librarySetting.sourceFolder
      setSettings(setting)
    }
    if (window.sendSyncToElectron) {
      let result = window.sendSyncToElectron('get-settings')
      setSettings(result)
    }
  }, [])

  function setAndSaveSettings(newSettings) {
    if (window.sendSyncToElectron) {
      window.sendSyncToElectron('set-settings', newSettings)
    }
    setSettings(newSettings)
  }

  return [existingSettings, setAndSaveSettings]
}

  
