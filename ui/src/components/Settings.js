import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useSelector } from 'react-redux'
import { getActiveLibrary } from '../stores/libraries/selector'

import {
  Switch,
  Flex,
  Stack,
  FormLabel,
  Input,
  InputGroup,
  IconButton,
} from '@chakra-ui/core'

import Modal from './Modal'
import {
  SETTINGS_STYLE,
  SETTINGS_COLOR,
  SETTINGS_LOCATION,
  SETTINGS_OBJECT,
  SETTINGS_SOURCE_FOLDER,
  GET_SETTINGS,
} from '../graphql/settings'
// import folder from '../static/images/folder.svg'
import '../static/css/Settings.css'
import { Link } from 'react-router-dom'


const GET_ALL_PROFILE = gql`
  {
    allProfile {
      id
      username
      email
    }
  }
`
const GET_PROFILE = gql`
  {
    profile {
      id
      username
      email
    }
  }
`

const CREATE_LINK_USER_TO_LIBRARY = gql`
  mutation (
      $libraryId: ID!,
      $userId: ID!
      ){
        createLibraryUser(
          libraryId:$libraryId,
          userId:$userId
        ) {
          hasCreatedLibraryUser
          userId
          libraryId
        }
      } 
`

const REMOVE_LINK_USER_TO_LIBRARY = gql`
  mutation (
      $libraryId: ID!,
      $userId: ID!
      ) {
        removeLibraryUser(
            libraryId:$libraryId,
            userId:$userId
          ) {
            ok
          }
    }   
`

export default function Settings() {
  const user = useSelector((state) => state.user)
  const activeLibrary = useSelector(getActiveLibrary)
  const [settings, setSettings] = useSettings(activeLibrary)
  const [createLinkUserToLibrary] = useMutation(CREATE_LINK_USER_TO_LIBRARY)
  const [removeLinkUserToLibrary] = useMutation(REMOVE_LINK_USER_TO_LIBRARY)

  const [checkedUser, setCheckedUser] = useState({})
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

  // Use to fetch all users/profiles.
  const {
    loading: allProfileLoading,
    error: allProfileError,
    data: allProfileData,
  } = useQuery(GET_ALL_PROFILE, { skip: !user })
  
  // Use to fetch current profile.
  const {
    loading: profileLoading,
    error: profileError,
    data: profileData,
  } = useQuery(GET_PROFILE, { skip: !user })

  //  Use to link and remove the user with active library.
  const linkUser = (event, profileId) => {  
    if (profileId != profileData?.profile.id &&  !Object.values(checkedUser)[0]){
      createLinkUserToLibrary({
        variables:{
          libraryId:activeLibrary?.id,
          userId:profileId
        }
      }).catch((e) => {})
      // updating an single checkbox/switch value.
      setCheckedUser({...checkedUser, [event.target.id] : event.target.checked });
    }else if (Object.values(checkedUser)[0]){
      removeLinkUserToLibrary({
        variables:{
          libraryId:activeLibrary?.id,
          userId:profileId
        }
      }).catch((e) => {})
      // updating an single checkbox/switch value.
      setCheckedUser({...checkedUser, [event.target.id] : event.target.checked });
    }
  } 

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
      default:
        return null
    }
  }

  function onSelectSourceDir() {
    if (window.sendSyncToElectron) {
      let dirs = window.sendSyncToElectron('select-dir')
      setSettings({ sourceDirs: dirs })
    }
  }

  function onChangeSourceDir(e) {
    let newSettings = { ...settings }
    newSettings.sourceDirs = e.currentTarget.value
    setSettings(newSettings)
    settingUpdateSourceFolder({
      variables: {
        sourceFolder: newSettings.sourceDirs,
        libraryId: activeLibrary?.id,
      },
    }).catch((e) => {})
  }
  const [settingUpdateStyle] = useMutation(SETTINGS_STYLE)
  const [settingUpdateColor] = useMutation(SETTINGS_COLOR)
  const [settingUpdateLocation] = useMutation(SETTINGS_LOCATION)
  const [settingUpdateObject] = useMutation(SETTINGS_OBJECT)
  const [settingUpdateSourceFolder] = useMutation(SETTINGS_SOURCE_FOLDER)

  return (
    <Modal className="Settings" topAccent={true}>
      <h1 className="heading">Settings</h1>
      <h2 className="subHeading">{activeLibrary?.name}</h2>
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
                    onChange={onChangeSourceDir}
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
      {allProfileData ? 
      <div style={{ marginTop: '30px' }}>      
      <h1>User</h1>
      <table className="profile-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Last login</th>
            <th>Library access</th>
            {/* <th></th> */}
          </tr>
        </thead>
        {allProfileData.allProfile.map((profile) => (
          <tr key={profile.id}>
            <td>{profile.username}</td>
            <td>{profile.lastLogin}</td>
            <td>
                <Switch
                  key={profile.id}
                  id={profile.id}
                  isChecked={profile.id === profileData?.profile.id?  true : checkedUser[profile.id]}
                  onChange={(e) => linkUser(e, profile.id)}
                  variantColor="cyan"
                />
            </td>
            <td>
              <Link to='/account' style={{ color: '#FFF' }}>
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </table>
      </div> : ""
      }
      {profileData && profileData.profile?
        <Link to='/onboarding' style={{ color: '#FFF' }}>
          Add new
        </Link> : ""
      }


    </Modal>
  )
}

const useSettings = (activeLibrary) => {
  const [existingSettings, setSettings] = useState({})
  const { loading, data, refetch } = useQuery(GET_SETTINGS, {
    variables: { libraryId: activeLibrary?.id },
  })
  const isInitialMount = useRef(true)

  useEffect(() => {
    refetch()
  }, [activeLibrary, refetch])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      if (!loading && data) {
        let setting = { ...data.librarySetting.library }
        setting.sourceDirs = data.librarySetting.sourceFolder
        setSettings(setting)
      }
    }
    // TODO: Re-sync with desktop app
    // if (window.sendSyncToElectron) {
    //   let result = window.sendSyncToElectron('get-settings')
    //   setSettings(result)
    // }
  }, [data, loading])

  function setAndSaveSettings(newSettings) {
    if (window.sendSyncToElectron) {
      window.sendSyncToElectron('set-settings', newSettings)
    }
    setSettings(newSettings)
  }

  return [existingSettings, setAndSaveSettings]
}
