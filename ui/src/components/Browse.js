import React from 'react'
import { Link } from 'react-router-dom'
import HeaderContainer from '../containers/HeaderContainer'
import SearchContainer from '../containers/SearchContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import MapViewContainer from '../containers/MapViewContainer'
import Spinner from '../components/Spinner'
import arrowDown from '../static/images/arrow_down.svg'
import '../static/css/Browse.css'
import SimpleExample from './SimpleExample'


const Browse = ({ selectedFilters, mode, loading, error, photoSections, onFilterToggle, onClearFilters, onExpandCollapse, expanded }) => {
  let content = (mode === 'MAP')
  ?
    <MapViewContainer photos={photoSections[0].segments[0].photos} />
  :
    <PhotoListContainer selectedFilters={selectedFilters} photoSections={photoSections} />
  if (loading) content = <Spinner />
  if (error) content = <p>Error :(</p>

  return <div className="Browse flex-container-column">
    <HeaderContainer />
    <div className={expanded ? ` searchBar expanded` : `searchBar collapsed`}>
      <SearchContainer
        selectedFilters={selectedFilters}
        onFilterToggle={onFilterToggle}
        onClearFilters={onClearFilters} />
      <ul className="tabs">
        <Link to="?mode=timeline"><li>Timeline</li></Link>
        <Link to="?mode=map"><li>Map</li></Link>
      </ul>
      <div className="expandCollapse" onClick={onExpandCollapse}>
        <img src={arrowDown} alt="" />
      </div>
    </div>
    <div className="main">
      {/* { content } */}
      <SimpleExample />
    </div>
  </div>
}

export default Browse
