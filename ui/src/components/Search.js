import React from 'react'
import FiltersContainer from '../containers/FiltersContainer'
import SearchInputContainer from '../containers/SearchInputContainer'
import '../static/css/Search.css'

const Search = ({ selectedFilters, onFilterToggle, onClearFilters, search, updateSearchText }) => {
  return (
    <div className="Search">
      <SearchInputContainer selectedFilters={selectedFilters} onFilterToggle={onFilterToggle} onClearFilters={onClearFilters} search={search} updateSearchText={updateSearchText} />
      <FiltersContainer selectedFilters={selectedFilters} onFilterToggle={onFilterToggle} />
    </div>
  )
}

export default Search
