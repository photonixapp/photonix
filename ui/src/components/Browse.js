import React, { useState, useEffect, useCallback } from 'react'
import styled from '@emotion/styled'
import { useSwipeable } from 'react-swipeable'

import Header from './Header'
import Search from './Search'
import PhotoList from '../components/PhotoList'
import MapView from '../components/MapView'
import Spinner from '../components/Spinner'
import { ReactComponent as ArrowDownIcon } from '../static/images/arrow_down.svg'
import Tabs from '../components/Tabs'
import history from '../history'
import AlbumList from '../components/AlbumList'

const Container = styled('div')`
  height: 100%;
  width: 100%;
  position: fixed;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .searchBar {
    background: #333;
    position: relative;
    height: 310px;
    transition: height 300ms;
    transition-timing-function: ease-in-out;
    border-bottom-right-radius: 10px;
    border-bottom-left-radius: 10px;
  }
  .searchBar.collapsed {
    height: 0;
  }

  .expandCollapse {
    width: 24px;
    height: 24px;
    position: absolute;
    top: 16px;
    right: 13px;
    cursor: pointer;
  }
  .expandCollapse svg {
    filter: invert(0.7);
    transition: transform 300ms;
    transition-timing-function: ease-in-out;
  }
  .expanded .expandCollapse svg {
    transform: rotate(180deg);
  }

  .main {
    overflow: hidden;
    height: 100%;
  }
  .tabContainer {
    display: flex;
    justify-content: space-between;
    position: relative;
  }

  @media all and (min-width: 700px) {
  }
`

const Browse = ({
  profile,
  libraries,
  selectedFilters,
  mode,
  loading,
  error,
  photoSections,
  onFilterToggle,
  onClearFilters,
  search,
  updateSearchText,
  mapPhotos,
  refetchPhotos,
  refetchPhotoList,
  refetchAlbumList,
  mapPhotosRefetch,
}) => {
  const [expanded, setExpanded] = useState(false)
  const renderContent = () => {
    switch (mode) {
      case 'ALBUM_ID':
        return (
          <AlbumList
            photoSections={photoSections}
            refetchPhotos={refetchPhotos}
            refetchPhotoList={refetchPhotoList}
            refetchAlbumList={refetchAlbumList}
            mapPhotosRefetch={mapPhotosRefetch}
            mode={mode}
          />
        )
      case 'MAP':
        return <MapView photos={mapPhotos} />
      default:
        return (
          <PhotoList
            photoSections={photoSections}
            refetchPhotos={refetchPhotos}
            refetchPhotoList={refetchPhotoList}
            refetchAlbumList={refetchAlbumList}
            mapPhotosRefetch={mapPhotosRefetch}
            mode={mode}
          />
        )
    }
  }
  let content = renderContent()
  const handlers = useSwipeable({
    onSwipedDown: () => setExpanded(!expanded),
    onSwipedUp: () => setExpanded(!expanded),
  })
  if (loading) content = <Spinner />
  if (error) content = <p>Error :(</p>

  const [searchMinHeight, setSearchMinHeight] = useState(0)
  const getInitialIndex = useCallback(() => {
    switch (mode) {
      case 'TIMELINE':
        return 0
      case 'ALBUMS':
        return 1
      case 'ALBUM_ID':
        return 1
      case 'MAP':
        return 2
      default:
        return 0
    }
  }, [mode])
  const [tabSelectedIndex, setTabSelectedIndex] = useState(getInitialIndex)
  useEffect(() => {
    setTabSelectedIndex(getInitialIndex)
  }, [mode, getInitialIndex])

  return (
    <Container>
      <Header profile={profile} libraries={libraries} />
      <div
        className={expanded ? ` searchBar expanded` : `searchBar collapsed`}
        style={{ height: !expanded && searchMinHeight }}
      >
        <Search
          selectedFilters={selectedFilters}
          search={search}
          onFilterToggle={onFilterToggle}
          onClearFilters={onClearFilters}
          updateSearchText={updateSearchText}
          searchAreaExpand={expanded}
          minHeightChanged={setSearchMinHeight}
          mode={mode}
        />
        {mode !== 'ALBUMS' && (
          <div
            {...handlers}
            className="expandCollapse"
            onClick={() => setExpanded(!expanded)}
          >
            <ArrowDownIcon />
          </div>
        )}
      </div>
      <div className="main">
        <Tabs
          tabs={[
            {
              label: 'Timeline',
              onClick: () => {
                setExpanded(false)
                mode === 'ALBUMS' && onClearFilters()
                history.push('?mode=timeline')
              },
            },
            {
              label: 'Albums',
              onClick: () => {
                setExpanded(false)
                onClearFilters()
                history.push('?mode=albums')
              },
            },
            {
              label: 'Map',
              onClick: () => {
                setExpanded(false)
                history.push('?mode=map')
              },
            },
          ]}
          initiallySelectedIndex={tabSelectedIndex}
        />
        {content}
      </div>
    </Container>
  )
}

export default Browse
