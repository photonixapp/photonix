import React, { useState } from 'react'
import styled from '@emotion/styled'
import useLocalStorageState from 'use-local-storage-state'
import { useSwipeable } from 'react-swipeable'

import Header from './Header'
import Search from './Search'
import PhotoList from '../components/PhotoList'
import MapView from '../components/MapView'
import Spinner from '../components/Spinner'
import { ReactComponent as ArrowDownIcon } from '../static/images/arrow_down.svg'
import Tabs from '../components/Tabs'
import history from '../history'

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
    .FiltersContent {
      opacity: 0;
    }
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
}) => {
  const [expanded, setExpanded] = useLocalStorageState(
    'searchExpanded',
    window.innerHeight > 850 ? true : false
  )
  let content =
    mode === 'MAP' ? (
      <MapView photos={mapPhotos} />
    ) : (
      <PhotoList photoSections={photoSections} refetchPhotos={refetchPhotos} refetchPhotoList={refetchPhotoList} />
    )
  const handlers = useSwipeable({
    onSwipedDown: () => setExpanded(!expanded),
    onSwipedUp: () => setExpanded(!expanded),
  })
  if (loading) content = <Spinner />
  if (error) content = <p>Error :(</p>

  const [searchMinHeight, setSearchMinHeight] = useState(0)

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
        />
        <div
          {...handlers}
          className="expandCollapse"
          onClick={() => setExpanded(!expanded)}
        >
          <ArrowDownIcon />
        </div>
      </div>
      <div className="main">
        <Tabs
          tabs={[
            {
              label: 'Timeline',
              onClick: () => history.push('?mode=timeline'),
            },
            {
              label: 'Map',
              onClick: () => history.push('?mode=map'),
            },
          ]}
          initiallySelectedIndex={mode === 'MAP' ? 1 : 0}
        />
        {content}
      </div>
    </Container>
  )
}

export default Browse
