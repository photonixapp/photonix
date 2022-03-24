import React, { useState } from 'react'
import styled from '@emotion/styled'

import FiltersContainer from '../containers/FiltersContainer'
import SearchInput from './SearchInput'

const Container = styled('div')`
  padding: 10px;
  overflow: hidden;
  h2 {
    font-size: 18px;
  }

  @media all and (min-width: 700px) {
    padding: 10px;
  }
  @media all and (min-width: 1024px) {
    padding: 10px;
  }
`

const Search = ({
  selectedFilters,
  onFilterToggle,
  onClearFilters,
  search,
  updateSearchText,
  searchAreaExpand,
  minHeightChanged,
  mode,
}) => {
  const [filters, setFilters] = useState([])
  return (
    <Container>
      <SearchInput
        selectedFilters={selectedFilters}
        onFilterToggle={onFilterToggle}
        onClearFilters={onClearFilters}
        search={search}
        onSearchTextChange={updateSearchText}
        filters={filters}
        setFilters={setFilters}
        minHeightChanged={minHeightChanged}
        mode={mode}
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
