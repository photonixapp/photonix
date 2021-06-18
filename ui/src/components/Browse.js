import React from 'react'
import styled from '@emotion/styled'
import { Link } from 'react-router-dom'
import useLocalStorageState from 'use-local-storage-state'
import { useSwipeable } from 'react-swipeable'

import Header from './Header'
import SearchContainer from '../containers/SearchContainer'
import PhotoList from '../components/PhotoList'
import MapView from '../components/MapView'
import Spinner from '../components/Spinner'
import arrowDown from '../static/images/arrow_down.svg'

const Container = styled('div')`
  height: 100%;
  width: 100%;
  position: fixed;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .tabs {
    display: inline-block;
    margin: 0;
    padding: 0;
    position: absolute;
    right: 40px;
    bottom: 0;
  }
  .tabs li {
    display: inline-block;
    list-style: none;
    padding: 8px 20px;
    background: #1d1d1d;
    font-weight: 600;
  }
  .tabs button {
    width: 32px;
  }
  .tabs a {
    color: #ddd;
    margin-left: 10px;
  }

  .searchBar {
    background: #292929;
    position: relative;
    height: 330px;
    transition: all 200ms;
    transition-timing-function: ease-in-out;
  }
  .searchBar.collapsed {
    height: 140px;
    .FiltersContent {
      opacity: 0;
    }
  }

  .expandCollapse {
    width: calc(100% - 202px);
    height: 24px;
    position: absolute;
    bottom: 10px;
    left: 40px;
    cursor: pointer;
  }
  .expandCollapse img {
    filter: invert(0.9);
    transition: all 600ms;
    transition-timing-function: ease-in-out;
  }
  .expanded .expandCollapse img {
    transform: rotate(-180deg);
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

  @media all and (max-width: 700px) {
    .tabs {
      right: 20px;
    }
    .searchBar.collapsed {
      height: 110px;
    }
    .expandCollapse {
      bottom: 10px;
      left: 10px;
    }
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
  setIsMapShowing,
  mapPhotos,
  refetchPhotos,
}) => {
  const [expanded, setExpanded] = useLocalStorageState(
    'searchExpanded',
    window.innerHeight > 850 ? true : false
  )
  let content =
    mode === 'MAP' ? (
      <MapView photos={mapPhotos} />
    ) : (
      <PhotoList photoSections={photoSections} refetchPhotos={refetchPhotos} />
    )
  const handlers = useSwipeable({
    onSwipedDown: () => setExpanded(!expanded),
    onSwipedUp: () => setExpanded(!expanded),
  })

  if (loading) content = <Spinner />
  if (error) content = <p>Error :(</p>

  return (
    <Container>
      <Header profile={profile} libraries={libraries} />
      <div className={expanded ? ` searchBar expanded` : `searchBar collapsed`}>
        <SearchContainer
          selectedFilters={selectedFilters}
          search={search}
          onFilterToggle={onFilterToggle}
          onClearFilters={onClearFilters}
          updateSearchText={updateSearchText}
          searchAreaExpand={expanded}
        />
      </div>
      <div
        className={
          expanded ? ` tabContainer expanded` : `tabContainer collapsed`
        }
      >
        <div
          {...handlers}
          className="expandCollapse"
          onClick={() => setExpanded(!expanded)}
        >
          <img src={arrowDown} alt="" />
        </div>
        <ul className="tabs">
          <Link to="?mode=timeline" onClick={() => setIsMapShowing(false)}>
            <li>Timeline</li>
          </Link>
          <Link to="?mode=map" onClick={() => setIsMapShowing(true)}>
            <li>Map</li>
          </Link>
        </ul>
      </div>
      <div className="main">{content}</div>
    </Container>
  )
}

export default Browse
