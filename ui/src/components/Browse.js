import React from 'react'
import { Link } from 'react-router-dom'
import useLocalStorageState from 'use-local-storage-state'

import Header from './Header'
import SearchContainer from '../containers/SearchContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import MapView from '../components/MapView'
import Spinner from '../components/Spinner'
import arrowDown from '../static/images/arrow_down.svg'
import '../static/css/Browse.css'

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
  mapPhotos
}) => {
  const [expanded, setExpanded] = useLocalStorageState(
    'searchExpanded',
    window.innerHeight > 850 ? true : false
  )

  let content =
    mode === 'MAP' ? (
      <MapView photos={mapPhotos} />
    ) : (
      <PhotoListContainer
        selectedFilters={selectedFilters}
        photoSections={photoSections}
      />
    )

  if (loading) content = <Spinner />
  if (error) content = <p>Error :(</p>

  return (
    <div className="Browse flex-container-column">
      <Header profile={profile} libraries={libraries} />
      <div className={expanded ? ` searchBar expanded` : `searchBar collapsed`}>
        <SearchContainer
          selectedFilters={selectedFilters}
          search={search}
          onFilterToggle={onFilterToggle}
          onClearFilters={onClearFilters}
          updateSearchText={updateSearchText}
        />
        <ul className="tabs">
          <Link to="?mode=timeline" onClick={() => setIsMapShowing(false)}>
            <li>Timeline</li>
          </Link>
          <Link to="?mode=map" onClick={() => setIsMapShowing(true)}>
            <li>Map</li>
          </Link>
        </ul>
        <div className="expandCollapse" onClick={() => setExpanded(!expanded)}>
          <img src={arrowDown} alt="" />
        </div>
      </div>
      <div className="main">{content}</div>
    </div>
  )
}

export default Browse
