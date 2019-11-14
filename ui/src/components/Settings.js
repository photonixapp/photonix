import React, { useState, useEffect } from 'react';
import history from '../history'

import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import '../static/css/Settings.css'
import folder from '../static/images/folder.svg'


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
  ]

  function toggleBooleanSetting(key) {
    let newSettings = {}
    newSettings[key] = !settings[key]
    setSettings(newSettings)
  }

  function onSelectSourceDir() {
    if (window.sendSyncToElectron) {
      let dirs = window.sendSyncToElectron('select-dir')
      setSettings({sourceDirs: dirs})
    }
  }


  return (
    <div className="Settings">
      <span onClick={history.goBack}>
        <CloseIcon className="closeIcon" alt="Close" />
      </span>
      <h2>Settings</h2>
      <ul>
        {availableSettings.map((item, index) => {
          let field = null
          let icon = null

          if (settings) {
            if (item.type === 'path') {
              console.log(settings[item.key])
              field = <input type="text" value={settings ? settings[item.key] : 'empty'} />
              icon = <span onClick={onSelectSourceDir}><img src={folder} className="folder" alt="" /></span>
            }

            else if (item.type === 'boolean') {
              console.log(item.key + ': ' + settings[item.key])
              if (settings[item.key]) {
                field = <span onClick={() => toggleBooleanSetting(item.key)}>Yes</span>
              }
              else {
                field = <span onClick={() => toggleBooleanSetting(item.key)}>No</span>
              }
            }
          }

          return (
            <li key={item.key}>
              <div>{item.name}</div>
              <div>{field}</div>
              {icon}
            </li>
          )
        })}
      </ul>
    </div>
  );
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
