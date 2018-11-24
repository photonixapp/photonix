import React from 'react'
import FiltersContainer from '../containers/FiltersContainer'
import '../static/css/Search.css'

const Search = () => (
  <div className="Search">
    <input type="text" placeholder="Search" />
    <FiltersContainer />
  </div>
)

export default Search
