import React  from 'react'
import Settings from '../components/Settings'


export default class SettingsContainer extends React.Component {
  render = () => {
    if (this.props.visible) {
      return <Settings data={this.props.data} onHideModals={this.props.onHideModals} />
    }
    return null
  }
}
