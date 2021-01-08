import React from 'react'
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
    let flashIndex = filters.findIndex(item => item.group === "Flash")
    let isoIndex = filters.findIndex(item => item.group === "ISO Speed")
    let focalLengthIndex = filters.findIndex(item => item.group === "Focal Length")
    let apertureIndex = filters.findIndex(item => item.group === "Aperture")
    let exposureIndex = filters.findIndex(item => item.group === "Exposure")
      if (index === -1) {
        if(flashIndex !== -1 && group === "Flash" ) {
          filterIds[flashIndex] = id
          filters[flashIndex] = {id:id,name:name,group:group}
        } else if(isoIndex !== -1 && group === "ISO Speed") {
          filterIds[isoIndex] = id
          filters[isoIndex] = {id:id,name:name,group:group}
        } else if(focalLengthIndex !== -1 && group === "Focal Length") {
          filterIds[focalLengthIndex] = id
          filters[focalLengthIndex] = {id:id,name:name,group:group}
        } else if(apertureIndex !== -1 && group === "Aperture") {
          filterIds[apertureIndex] = id
          filters[apertureIndex] = {id:id,name:name,group:group}
        } else if(exposureIndex !== -1 && group === "Exposure") {
          filterIds[exposureIndex] = id
          filters[exposureIndex] = {id:id,name:name,group:group}
        }
        else {
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
    })
  }

  logout = () => {
    console.log('logged out')
  }

  render = () => {
    return (
      <App
        selectedFilters={this.state.selectedFilters}
        onFilterToggle={this.onFilterToggle}
        onClearFilters={this.onClearFilters}
      />
    )
  }
}