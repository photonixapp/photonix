import React, { useState, useEffect } from 'react'
import { useQuery } from '@apollo/react-hooks'
import { useDispatch, useSelector } from 'react-redux'
import gql from 'graphql-tag'
import 'url-search-params-polyfill'
import { ENVIRONMENT } from '../graphql/onboarding'
import Browse from '../components/Browse'
import { getActiveLibrary } from '../stores/library/selector'

const GET_LIBRARIES = gql`
  {
    allLibraries {
      id
      name
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
const GET_PHOTOS = gql`
  query Photos($filters: String) {
    allPhotos(multiFilter: $filters) {
      edges {
        node {
          id
          location
          starRating
        }
      }
    }
  }
`

const BrowseContainer = (props) => {
  const dispatch = useDispatch()
  const [isLibrarySet, setIsLibrarySet] = useState(false)
  const user = useSelector((state) => state.user) // Using user here from Redux store so we can wait for any JWT tokens to be refreshed before running GraphQL queries that require authentication
  const activeLibrary = useSelector(getActiveLibrary)
  const [expanded, setExpanded] = useState(true)
  const [photoData, setPhotoData] = useState()

  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
    ? params.get('mode').toUpperCase()
    : 'TIMELINE'

  const { data: envData } = useQuery(ENVIRONMENT)
  const {
    loading: librariesLoading,
    error: librariesError,
    data: librariesData,
  } = useQuery(GET_LIBRARIES, { skip: !user })

  if (librariesData && librariesData.allLibraries.length && !isLibrarySet) {
    const libs = librariesData.allLibraries.map((lib, index) => {
      const lsActiveLibrary = localStorage.getItem('activeLibrary')
      if (lsActiveLibrary) {
        lib['isActive'] = lsActiveLibrary == lib.id ? true : false
      } else {
        lib['isActive'] = index === 0 ? true : false
        index === 0 && localStorage.setItem('activeLibrary', lib.id)
      }
      return lib
    })
    dispatch({
      type: 'SET_LIBRARIES',
      payload: libs,
    })
    setIsLibrarySet(true)
  }

  const {
    loading: profileLoading,
    error: profileError,
    data: profileData,
  } = useQuery(GET_PROFILE, { skip: !user })

  let photoSections = []
  let photos = []
  let filtersStr = ''
  if (activeLibrary) {
    filtersStr = `library_id:${activeLibrary.id} ${props.selectedFilters
      .map((filter) => filter.id)
      .join(' ')}`
    if (props.search.length >= 2) {
      filtersStr = filtersStr.length
        ? `${filtersStr} ${props.search}`
        : props.search
    }
  }
  const {
    loading: photosLoading,
    error: photosError,
    data: photosData,
    refetch,
  } = useQuery(
    GET_PHOTOS,
    {
      variables: {
        filters: filtersStr,
      },
    },
    {
      skip: !isLibrarySet,
    }
  )
  if (photosError) {
    console.log('photosError', photosError)
  }

  useEffect(() => {
    if (envData && envData.environment && !envData.environment.firstRun) {
      refetch()
    }
    if (photosData) setPhotoData(photosData)
  })

  if (photoData) {
    photos = photoData.allPhotos.edges.map((photo) => ({
      id: photo.node.id,
      thumbnail: `/thumbnails/256x256_cover_q50/${photo.node.id}/`,
      location: photo.node.location
        ? [photo.node.location.split(',')[0], photo.node.location.split(',')[1]]
        : null,
      starRating: photo.node.starRating,
    }))
  }

  let section = {
    id: 12345,
    title: null,
    segments: [
      {
        numPhotos: photos.length,
        photos: photos,
      },
    ],
  }

  photoSections.push(section)

  let anyLoading = profileLoading || librariesLoading || photosLoading
  let anyError = profileError
    ? profileError
    : librariesError
    ? librariesError
    : photosError

  return (
    <>
      {isLibrarySet && (
        <Browse
          profile={profileData ? profileData.profile : null}
          libraries={librariesData ? librariesData.allLibraries : null}
          selectedFilters={props.selectedFilters}
          search={props.search}
          updateSearchText={props.updateSearchText}
          mode={mode}
          loading={anyLoading}
          error={anyError}
          photoSections={photoSections}
          onFilterToggle={props.onFilterToggle}
          onClearFilters={props.onClearFilters}
          expanded={expanded}
          onExpandCollapse={() => setExpanded(!expanded)}
        />
      )}
    </>
  )
}

export default BrowseContainer
