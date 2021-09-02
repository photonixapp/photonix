import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useSelector } from 'react-redux'
import { getActiveLibrary } from '../stores/libraries/selector'

import {
  Switch,
  Flex,
  Stack,
  FormLabel,
  // Input,
  // InputGroup,
  // IconButton,
} from '@chakra-ui/core'

import Modal from './Modal'
import {
  SETTINGS_STYLE,
  SETTINGS_COLOR,
  SETTINGS_LOCATION,
  SETTINGS_OBJECT,
  SETTINGS_FACE,
  // SETTINGS_SOURCE_FOLDER,
  GET_SETTINGS,
} from '../graphql/settings'
// import folder from '../static/images/folder.svg'
import '../static/css/Settings.css'

export default function Settings() {
  const activeLibrary = useSelector(getActiveLibrary)
  const [settings, setSettings] = useSettings(activeLibrary)
  const availableSettings = [
    // {
    //   key: 'sourceDirs',
    //   type: 'path',
    //   label: 'Source folder',
    // },
    {
      key: 'watchPhotos',
      type: 'boolean',
      label: 'Watch folder for new photos',
    },
    {
      key: 'classificationColorEnabled',
      type: 'boolean',
      label: 'Run color analysis on photos',
    },
    {
      key: 'classificationLocationEnabled',
      type: 'boolean',
      label: 'Run location detection on photos',
    },
    {
      key: 'classificationFaceEnabled',
      type: 'boolean',
      label: 'Run face recognition on photos',
    },
    {
      key: 'classificationStyleEnabled',
      type: 'boolean',
      label: 'Run style classification on photos',
    },
    {
      key: 'classificationObjectEnabled',
      type: 'boolean',
      label: 'Run object detection on photos',
    },
  ]

  function toggleBooleanSetting(key) {
    let newSettings = { ...settings }
    newSettings[key] = !settings[key]
    setSettings(newSettings)
    switch (key) {
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

  // TODO: Re-implement desktop app settings integration
  // function onSelectSourceDir() {
  //   if (window.sendSyncToElectron) {
  //     let dirs = window.sendSyncToElectron('select-dir')
  //     setSettings({ sourceDirs: dirs })
  //   }
  // }

  // function onChangeSourceDir(e) {
  //   let newSettings = { ...settings }
  //   newSettings.sourceDirs = e.currentTarget.value
  //   setSettings(newSettings)
  //   settingUpdateSourceFolder({
  //     variables: {
  //       sourceFolder: newSettings.sourceDirs,
  //       libraryId: activeLibrary?.id,
  //     },
  //   }).catch((e) => {})
  // }

  const [settingUpdateStyle] = useMutation(SETTINGS_STYLE)
  const [settingUpdateColor] = useMutation(SETTINGS_COLOR)
  const [settingUpdateLocation] = useMutation(SETTINGS_LOCATION)
  const [settingUpdateObject] = useMutation(SETTINGS_OBJECT)
  const [settingUpdateFace] = useMutation(SETTINGS_FACE)
  // const [settingUpdateSourceFolder] = useMutation(SETTINGS_SOURCE_FOLDER)

  return (
    <Modal className="Settings" topAccent={true}>
      <h1 className="heading">Settings</h1>
      <h2 className="subHeading">{activeLibrary?.name}</h2>
      <Stack spacing={4}>
        {availableSettings.map((item, index) => {
          let field = null

          if (settings) {
            if (item.type === 'path') {
              // field = (
              //   <InputGroup size="sm">
              //     <Input
              //       rounded="0"
              //       value={settings ? settings[item.key] : 'empty'}
              //       onChange={onChangeSourceDir}
              //     />
              //     <IconButton
              //       aria-label="Select source folder"
              //       icon="search"
              //       onClick={onSelectSourceDir}
              //     />
              //   </InputGroup>
              // )
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
    </Modal>
  )
}

export const useSettings = (activeLibrary) => {
  const [existingSettings, setSettings] = useState({})
  const { loading, data, refetch } = useQuery(GET_SETTINGS, {
    variables: { libraryId: activeLibrary?.id },
  })
  // console.log(error)
  // const isInitialMount = useRef(true)

  // useEffect(() => {
  //   refetch()
  // }, [activeLibrary, refetch])

  useEffect(() => {
    if (activeLibrary && !loading) {
      refetch()
    }
  }, [activeLibrary, loading, refetch])

  useEffect(() => {
    // if (isInitialMount.current) {
    //   isInitialMount.current = false
    // } else {
    if (!loading && data) {
      let setting = { ...data.librarySetting.library }
      setting.sourceDirs = data.librarySetting.sourceFolder
      setSettings(setting)
    }
  }, [data, loading])

  // useEffect(() => {
  //   if (activeLibrary) {
  //     refetch()
  //   }
  //   if (!loading) {
  //     let setting = {...data.librarySetting.library}
  //     setting.sourceDirs = data.librarySetting.sourceFolder
  //     setSettings(setting)
  //   }
  //   if (window.sendSyncToElectron) {
  //     let result = window.sendSyncToElectron('get-settings')
  //     setSettings(result)
  //   }
  // }, [activeLibrary, loading, refetch, data])

  function setAndSaveSettings(newSettings) {
    // if (window.sendSyncToElectron) {
    //   window.sendSyncToElectron('set-settings', newSettings)
    // }
    setSettings(newSettings)
  }
  return [existingSettings, setAndSaveSettings]
}
