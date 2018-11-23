import React, { PropTypes } from 'react'
import FiltersContainer from '../containers/FiltersContainer'
import '../../static/css/Search.css'

const Search = () => (
  <div className="Search">
    <input type="text" />
    <FiltersContainer />
  </div>
)

export default Search
