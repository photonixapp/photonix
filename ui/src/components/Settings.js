import React, { useState, useEffect } from 'react'
import history from '../history'
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
// import folder from '../static/images/folder.svg'

export default function Settings() {
  const [settings, setSettings] = useSettings()

  const availableSettings = [
    {
      key: 'sourceDirs',
      type: 'path',
      name: 'Source folder',
    },
    {
      key: 'watchPhotos',
      type: 'boolean',
      name: 'Watch folder for new photos',
    },
    {
      key: 'classificationColor',
      type: 'boolean',
      name: 'Run color analysis on photos?',
    },
    {
      key: 'classificationLocation',
      type: 'boolean',
      name: 'Run location detection on photos?',
    },
    {
      key: 'classificationStyle',
      type: 'boolean',
      name: 'Run style classification on photos?',
    },
    {
      key: 'classificationObject',
      type: 'boolean',
      name: 'Run object detection on photos?',
    },
  ]

  function toggleBooleanSetting(key) {
    console.log(key)
    let newSettings = {}
    newSettings[key] = !settings[key]
    setSettings(newSettings)
  }

  function onSelectSourceDir() {
    if (window.sendSyncToElectron) {
      let dirs = window.sendSyncToElectron('select-dir')
      setSettings({ sourceDirs: dirs })
    }
  }

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
                  id={item.key + 'New'}
                  isChecked={settings[item.key]}
                  onChange={() => toggleBooleanSetting(item.key)}
                />
              )
            }
          }

          return (
            <Flex justify="space-between" key={item.key + item.type}>
              <FormLabel htmlFor={item.key}>{item.name}</FormLabel>
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

  useEffect(() => {
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
