import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { useDispatch, useSelector } from 'react-redux'
import gql from 'graphql-tag'
import { debounce } from 'throttle-debounce'

import 'url-search-params-polyfill'
import { ENVIRONMENT } from '../graphql/onboarding'
import Browse from '../components/Browse'
import { getActiveLibrary } from '../stores/libraries/selector'

const PHOTO_PER_PAGE = 100

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
  query Photos($filters: String, $after: String, $first: Int) {
    allPhotos(multiFilter: $filters, first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        cursor
        node {
          id
          location
          starRating
          rotation
        }
      }
    }
  }
`
const GET_MAP_PHOTOS = gql`
  query Photos($filters: String) {
    mapPhotos(multiFilter: $filters) {
      edges {
        node {
          id
          url
          location
          rotation
        }
      }
    }
  }
`
const GET_ALBUMS = gql`
  query AlbumList(
    $libraryId: UUID
    $name_Icontains: String
    $after: String
    $first: Int
  ) {
    albumList(
      libraryId: $libraryId
      name_Icontains: $name_Icontains
      first: $first
      after: $after
    ) {
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          id
          name
          photosCount
          coverImage {
            id
            location
            starRating
          }
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
  const [photoData, setPhotoData] = useState()
  const [isMapShowing, setIsMapShowing] = useState(false)
  const [searchStr, setSearchStr] = useState('')
  const debounced = useRef(debounce(400, (str) => setSearchStr(str)))
  const [albumData, setAlbumData] = useState()

  const params = new URLSearchParams(window.location.search)
  const mode = params.get('album_id')
    ? 'ALBUM_ID'
    : params.get('mode')
    ? params.get('mode').toUpperCase()
    : 'TIMELINE'

  if (mode === 'MAP' && !isMapShowing) setIsMapShowing(true)

  const { data: envData } = useQuery(ENVIRONMENT)
  const {
    loading: librariesLoading,
    error: librariesError,
    data: librariesData,
  } = useQuery(GET_LIBRARIES, { skip: !user })

  if (librariesData && librariesData.allLibraries.length && !isLibrarySet) {
    const libs = librariesData.allLibraries.map((lib, index) => {
      let newLib = { ...lib }
      const lsActiveLibrary = localStorage.getItem('activeLibrary')
      if (lsActiveLibrary) {
        newLib['isActive'] = lsActiveLibrary === lib.id ? true : false
      } else {
        newLib['isActive'] = index === 0 ? true : false
        index === 0 && localStorage.setItem('activeLibrary', lib.id)
      }
      return newLib
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
  let albums = []
  let filtersStr = ''
  if (activeLibrary) {
    filtersStr = `library_id:${activeLibrary.id} ${props.selectedFilters
      .map((filter) => filter.id)
      .join(' ')}`
    if (props.search.length >= 2) {
      filtersStr = filtersStr.length
        ? `${filtersStr} ${props.search}`
        : props.search
      debounced.current(filtersStr)
    } else {
      if (filtersStr !== searchStr) setSearchStr(filtersStr)
    }
  }
  const albumTagFilterStr =
    params.get('album_id') && `tag:${params.get('album_id')} ${searchStr}`
  const {
    loading: photosLoading,
    error: photosError,
    data: photosData,
    refetch,
    fetchMore: fetchMorePhotos,
  } = useQuery(
    GET_PHOTOS,
    {
      variables: {
        filters: albumTagFilterStr || searchStr,
        after: '',
        first: PHOTO_PER_PAGE,
      },
    },
    {
      skip: !isLibrarySet,
    }
  )
  if (photosError) {
    console.log('photosError', photosError)
  }

  const {
    error: mapPhotosError,
    data: mapPhotosData,
    refetch: mapPhotosRefetch,
  } = useQuery(GET_MAP_PHOTOS, {
    variables: {
      filters: searchStr,
      skip: !user,
    },
  })
  if (mapPhotosError) console.log(mapPhotosError)

  const updatePhotosStore = useCallback(
    (data) => {
      dispatch({
        type: 'SET_PHOTOS',
        payload: data,
      })
    },
    [dispatch]
  )

  useEffect(() => {
    // if (envData && envData.environment && !envData.environment.firstRun) {
    //   refetch()
    // }
    if (photosData) {
      setPhotoData(photosData)
      let ids = photosData?.allPhotos.edges.map((item) => item.node.id)
      let photoList = photosData?.allPhotos.edges
      let data = { ids: ids, photoList: photoList }
      updatePhotosStore(data)
    }
  }, [envData, photosData, updatePhotosStore])

  if (photoData) {
    photos = photoData.allPhotos.edges.map((photo) => ({
      id: photo.node.id,
      thumbnail: `/thumbnailer/photo/256x256_cover_q50/${photo.node.id}/`,
      location: photo.node.location,
      starRating: photo.node.starRating,
      rotation: photo.node.rotation,
    }))
  }

  const {
    loading: albumLoading,
    error: albumError,
    data: albumsData,
    refetch: refetchAlbumList,
  } = useQuery(
    GET_ALBUMS,
    {
      variables: {
        libraryId: activeLibrary && activeLibrary.id,
        name_Icontains: props.search || null,
        after: '',
        first: PHOTO_PER_PAGE,
      },
    },
    {
      skip: !isLibrarySet,
    }
  )

  albumError && console.log('albumError', albumError)
  useEffect(() => {
    if (albumsData) setAlbumData(albumsData)
  }, [albumsData])

  if (albumData) {
    albums = albumData.albumList.edges.reduce(function (result, album) {
      if (album.node.coverImage) {
        result.push({
          id: album.node.coverImage.id,
          thumbnail: `/thumbnailer/photo/256x256_cover_q50/${album.node.coverImage.id}/`,
          location: album.node.coverImage.location,
          starRating: album.node.coverImage.starRating,
          albumId: album.node.id,
          albumName: album.node.name,
          albumPhotosCount: album.node.photosCount,
        })
      }
      return result
    }, [])
  }

  let section = {
    id: 12345,
    title: null,
    segments: [
      {
        numPhotos: mode === 'ALBUMS' ? albums.length : photos.length,
        photos: mode === 'ALBUMS' ? albums : photos,
      },
    ],
  }

  photoSections.push(section)
  let anyLoading =
    profileLoading || librariesLoading || photosLoading || albumLoading
  let anyError = profileError
    ? profileError
    : librariesError
    ? librariesError
    : photosError
    ? photosError
    : albumError

  useEffect(() => {
    if (isMapShowing) mapPhotosRefetch()
  }, [isMapShowing, searchStr, mapPhotosRefetch])

  let photosWithLocation = []

  if (mapPhotosData) {
    photosWithLocation = mapPhotosData.mapPhotos.edges.map((photo) => ({
      id: photo.node.id,
      thumbnail: `/thumbnailer/photo/256x256_cover_q50/${photo.node.id}/`,
      location: photo.node.location,
      rotation: photo.node.rotation,
    }))
  }

  // Re-fetching photos when scroll bottom down.
  const refetchPhotos = () => {
    if (photoData) {
      if (photoData.allPhotos.pageInfo.hasNextPage) {
        const { endCursor } = photoData.allPhotos.pageInfo
        fetchMorePhotos({
          variables: { after: endCursor },
          updateQuery: (prevResult, { fetchMoreResult }) => {
            fetchMoreResult.allPhotos.edges = [
              ...prevResult.allPhotos.edges,
              ...fetchMoreResult.allPhotos.edges,
            ]
            return fetchMoreResult
          },
        })
      }
    }
  }

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
          setIsMapShowing={setIsMapShowing}
          mapPhotos={photosWithLocation}
          refetchPhotos={refetchPhotos}
          refetchPhotoList={refetch}
          refetchAlbumList={refetchAlbumList}
          mapPhotosRefetch={mapPhotosRefetch}
        />
      )}
    </>
  )
}

export default BrowseContainer
