import React  from 'react'
import history from '../history'
import App from '../components/App'


export default class AppContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selectedFilterIds: [],
      selectedFilters: [],
      detailPhoto: null,
    }

    window.showSettings = () => {
      history.push('/settings')
    }
  }

  onFilterToggle = (id, group, name) => {
    let filterIds = this.state.selectedFilterIds
    let filters = this.state.selectedFilters

    let index = filterIds.indexOf(id)
    if (index === -1) {
      filterIds.push(id)
      filters.push({
        id: id,
        name: name,
        group: group,
      })
    }
    else {
      filterIds.splice(index, 1)
      filters.splice(index, 1)
    }

    this.setState({
      selectedFilterIds: filterIds,
      selectedFilters: filters,
    })
  }

  onClearFilters = () => {
    this.setState({
      selectedFilterIds: [],
      selectedFilters: [],
    })
  }

  logout = () => {
    console.log('logged out')
  }

  render = () => {
    return <App
      selectedFilters={this.state.selectedFilters}
      onFilterToggle={this.onFilterToggle}
      onClearFilters={this.onClearFilters} />
  }
}
