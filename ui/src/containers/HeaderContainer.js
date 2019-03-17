import React  from 'react'
import Header from '../components/Header'


export default class HeaderContainer extends React.Component {

  render = () => {
    return <Header onShowSettings={this.props.onShowSettings} />
  }
}
