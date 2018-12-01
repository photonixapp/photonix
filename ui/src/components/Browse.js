import React from 'react'
import { BrowserRouter as Link } from 'react-router-dom'
import SearchContainer from '../containers/SearchContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import MapViewContainer from '../containers/MapViewContainer'
import '../static/css/Browse.css'

const Browse = ({ selectedFilters, mode, photos }) => (
  <div className="Browse flex-container-column">
    <header>
      <SearchContainer selectedFilters={selectedFilters} onToggle="" />
      <ul className="tabs">
        <Link to="/"><li>Timeline</li></Link>
        <Link to="/?mode=map"><li>Map</li></Link>
      </ul>
    </header>
    <div className="main flex-container-row">
      <section id="content">
        {
          mode === 'MAP'
          ?
            <MapViewContainer photos={photos} />
          :
            <PhotoListContainer selectedFilters={selectedFilters} photos={photos} />
        }
      </section>
    </div>
  </div>
)

export default Browse
