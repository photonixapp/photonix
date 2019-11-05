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
      settings: null,
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

  onShowSettings = () => {
    this.setState({
      showSettings: true,
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
      settings={this.state.settings}
      onGetParentSettings={this.onGetParentSettings} />
  }
}
