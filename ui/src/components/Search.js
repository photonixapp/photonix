import React from 'react'
import FiltersContainer from '../containers/FiltersContainer'
import '../static/css/Search.css'

const Search = ({ selectedFilters, onToggle }) => {
  return (
    <div className="Search">
      <input type="text" placeholder="Search" value={selectedFilters} />
      <FiltersContainer onToggle={onToggle} />
    </div>
  )
}

export default Search
