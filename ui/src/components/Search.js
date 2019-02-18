import React from 'react'
import FiltersContainer from '../containers/FiltersContainer'
import SearchInputContainer from '../containers/SearchInputContainer'
import '../static/css/Search.css'

const Search = ({ selectedFilters, onFilterToggle }) => {
  return (
    <div className="Search">
      <SearchInputContainer selectedFilters={selectedFilters} onFilterToggle={onFilterToggle} />
      <FiltersContainer onFilterToggle={onFilterToggle} />
    </div>
  )
}

export default Search
