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
      showSettings: false,
    }
    this.visible = false
  }

  componentWillReceiveProps = (props) => {
    if (props.visible && !this.visible) {
      this.props.onGetParentSettings()
      this.visible = true
    }
    else if (!props.visible) {
      this.visible = false
    }
  }

  onSelectSourceDir = () => {
    if (window.sendSyncToElectron) {
      window.sendToElectron('select-dir')
      setTimeout(this.props.onGetParentSettings, 1000)
    }
  }

  render = () => {
    if (this.props.visible) {
      return <Settings data={this.props.data} parentSettings={this.props.settings} onSelectSourceDir={this.onSelectSourceDir} onHideModals={this.props.onHideModals} />
    }
    return null
  }
}
