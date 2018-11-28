import React  from 'react'
// import { Query } from "react-apollo"
// import gql from "graphql-tag"
import App from '../components/App'


export default class SearchContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selectedFilters: [],
    }
  }

  onToggle = (id) => {
    let filters = this.state.selectedFilters
    let index = filters.indexOf(id)
    if (index === -1) {
      filters.push(id)
    }
    else {
      filters.splice(index, 1)
    }

    this.setState({
      selectedFilters: filters,
    })
  }

  render() {
    return <App selectedFilters={this.state.selectedFilters} onToggle={this.onToggle} />
  }
}