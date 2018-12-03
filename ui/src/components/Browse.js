import React from 'react'
import { Link } from 'react-router-dom'
import SearchContainer from '../containers/SearchContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import MapViewContainer from '../containers/MapViewContainer'
import Spinner from '../components/Spinner'
import '../static/css/Browse.css'

const Browse = ({ selectedFilters, mode, loading, error, photos, onToggle }) => {
  let content = (mode === 'MAP')
  ?
    <MapViewContainer photos={photos} />
  :
    <PhotoListContainer selectedFilters={selectedFilters} photos={photos} />
  if (loading) content = <Spinner />
  if (error) content = <p>Error :(</p>

  return <div className="Browse flex-container-column">
    <header>
      <SearchContainer selectedFilters={selectedFilters} onToggle={onToggle} />
      <ul className="tabs">
        <Link to="?mode=timeline"><li>Timeline</li></Link>
        <Link to="?mode=map"><li>Map</li></Link>
      </ul>
    </header>
    <div className="main flex-container-row">
      <section id="content">
        { content }
      </section>
    </div>
  </div>
}

export default Browse
