import React from 'react'
import history from '../history'
import App from '../components/App'

export default class AppContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selectedFilterIds: [],
      selectedFilters: [],
      search: '',
      detailPhoto: null,
    }

    // Functions added to the window so things like desktop and mobile apps can call them
    window.showSettings = () => {
      history.push('/settings')
    }
  }

  onFilterToggle = (id, group, name) => {
    let filterIds = this.state.selectedFilterIds
    let filters = this.state.selectedFilters
    let index = filterIds.indexOf(id)
    let flashIndex = filters.findIndex((item) => item.group === 'Flash')
    let isoIndex = filters.findIndex((item) => item.group === 'ISO Speed')
    let focalLengthIndex = filters.findIndex(
      (item) => item.group === 'Focal Length'
    )
    let apertureIndex = filters.findIndex((item) => item.group === 'Aperture')
    let exposureIndex = filters.findIndex((item) => item.group === 'Exposure')
    let ratingIndex = filters.findIndex((item) => item.group === 'Rating')
    if (index === -1) {
      if (flashIndex !== -1 && group === 'Flash') {
        filterIds[flashIndex] = id
        filters[flashIndex] = { id: id, name: name, group: group }
      } else if (isoIndex !== -1 && group === 'ISO Speed') {
        filterIds[isoIndex] = id
        filters[isoIndex] = { id: id, name: name, group: group }
      } else if (focalLengthIndex !== -1 && group === 'Focal Length') {
        filterIds[focalLengthIndex] = id
        filters[focalLengthIndex] = { id: id, name: name, group: group }
      } else if (apertureIndex !== -1 && group === 'Aperture') {
        filterIds[apertureIndex] = id
        filters[apertureIndex] = { id: id, name: name, group: group }
      } else if (exposureIndex !== -1 && group === 'Exposure') {
        filterIds[exposureIndex] = id
        filters[exposureIndex] = { id: id, name: name, group: group }
      } else if (ratingIndex !== -1 && group === 'Rating') {
        filterIds[ratingIndex] = id
        filters[ratingIndex] = { id: id, name: name, group: group }
      } else {
        filterIds.push(id)
        filters.push({
          id: id,
          name: name,
          group: group,
        })
      }
    } else {
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
      search: '',
    })
  }

  updateSearchText = (value) => {
    this.setState({ search: value })
  }

  render = () => {
    return (
      <App
        selectedFilters={this.state.selectedFilters}
        onFilterToggle={this.onFilterToggle}
        onClearFilters={this.onClearFilters}
        search={this.state.search}
        updateSearchText={this.updateSearchText}
      />
    )
  }
}
