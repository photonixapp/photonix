import React  from 'react'
import Search from '../components/Search'


export default class SearchContainer extends React.Component {
  render = () => {
    return <Search
      selectedFilters={this.props.selectedFilters}
      search={this.props.search}
      onFilterToggle={this.props.onFilterToggle}
      onClearFilters={this.props.onClearFilters}
      updateSearchText={this.props.updateSearchText}
      searchAreaExpand={this.props.searchAreaExpand} 
    />
  }
}
