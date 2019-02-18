import React  from 'react'
import SearchInput from '../components/SearchInput'


export default class SearchInputContainer extends React.Component {
  render() {
    return <SearchInput selectedFilters={this.props.selectedFilters} onFilterToggle={this.props.onFilterToggle} />
  }
}