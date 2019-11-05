import React  from 'react'
import Settings from '../components/Settings'


export default class SettingsContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selectedFilterIds: [],
      selectedFilters: [],
      detailPhoto: null,
      config: {},
    }
  }

  onSelectSourceDir = () => {
    if (window.sendSyncToElectron) {
      window.sendToElectron('select-dir')
      setTimeout(this.props.onGetParentSettings, 1000)
    }
  }

  render = () => {
    return <Settings data={this.props.data} parentSettings={this.props.settings} onSelectSourceDir={this.onSelectSourceDir} onHideModals={this.props.onHideModals} />
  }
}
