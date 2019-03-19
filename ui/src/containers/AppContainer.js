import React  from 'react'
// import { Query } from "react-apollo"
// import gql from "graphql-tag"
import App from '../components/App'


export default class AppContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selectedFilterIds: [],
      selectedFilters: [],
      detailPhoto: null,
      settings: null,
      showSettings: false,
    }
    window.showSettings = (message) => {
      this.setState({
        showSettings: true
      })
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

  onShowSettings = () => {
    this.setState({
      showSettings: true,
    })
  }

  onHideModals = () => {
    this.setState({
      showSettings: false,
    })
  }

  onGetParentSettings = () => {
    if (window.sendSyncToElectron) {
      let result = window.sendSyncToElectron('get-settings')
      this.setState({settings: result})
    }
  }

  logout = () => {
    console.log('logged out')
  }

  render = () => {
    return <App
      selectedFilters={this.state.selectedFilters}
      onFilterToggle={this.onFilterToggle}
      onClearFilters={this.onClearFilters}
      onShowSettings={this.onShowSettings}
      showSettings={this.state.showSettings}
      onHideModals={this.onHideModals}
      settings={this.state.settings}
      onGetParentSettings={this.onGetParentSettings} />
  }
}
