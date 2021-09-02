import React, { useState } from 'react'
import styled from '@emotion/styled'

import FiltersContainer from '../containers/FiltersContainer'
import SearchInputContainer from '../containers/SearchInputContainer'

const Container = styled('div')`
  padding: 40px;
  overflow: hidden;
  h2 {
    font-size: 18px;
  }

  @media all and (max-width: 1024px) {
    padding: 20px;
  }
  @media all and (max-width: 700px) {
    padding: 10px;
  }
`

const Search = ({
  selectedFilters,
  onFilterToggle,
  onClearFilters,
  search,
  updateSearchText,
  searchAreaExpand
}) => {
  const [filters, setFilters] = useState([])
  return (
    <Container>
      <SearchInputContainer
        selectedFilters={selectedFilters}
        onFilterToggle={onFilterToggle}
        onClearFilters={onClearFilters}
        search={search}
        updateSearchText={updateSearchText}
        filters={filters}
      />
      <FiltersContainer
        selectedFilters={selectedFilters}
        onFilterToggle={onFilterToggle}
        setFilters={setFilters}
        searchAreaExpand={searchAreaExpand}
      />
    </Container>
  )
}

export default Search
