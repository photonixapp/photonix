import React  from 'react'
import { Query } from "react-apollo"
import gql from "graphql-tag"
import Filters from '../components/Filters'
import Spinner from '../components/Spinner'


const GET_FILTERS = gql`
  {
    allLocationTags {
      id
      name
    }
    allObjectTags {
      id
      name
    }
    allPersonTags {
      id
      name
    }
    allColorTags {
      id
      name
    }
    allStyleTags {
      id
      name
    }
    allCameras {
      id
      make
      model
    }
    allLenses {
      id
      name
    }
  }
`
const PADDING = 40
const SCROLLBAR_WIDTH = 200

export default class FiltersContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      scrollbarLeft: PADDING,
    }
  }

  onScroll = (e) => {
    const parentWidth = e.currentTarget.parentElement.clientWidth + (PADDING * 2)
    const contentWidth = e.currentTarget.firstChild.clientWidth + PADDING
    const contentScrollDistance = contentWidth - parentWidth
    const scrollbarScrollAvailable = parentWidth - SCROLLBAR_WIDTH - (PADDING * 2)
    const scrollProgress = e.currentTarget.scrollLeft / contentScrollDistance
    const left = scrollProgress * scrollbarScrollAvailable + PADDING

    this.setState({scrollbarLeft: left})
  }

  render() {
    const onToggle = this.props.onToggle
    return <div>
      <Query query={GET_FILTERS}>
        {({ loading, error, data }) => {
          if (loading) return <Spinner />
          if (error) return <p>Error :(</p>

          let filterData = []
          if (data.allLocationTags.length) {
            filterData.push({
              name: 'Locations',
              items: data.allLocationTags.map((tag) => (
                {id: tag.id, name: tag.name}
              )),
            })
          }
          if (data.allObjectTags.length) {
            filterData.push({
              name: 'Objects',
              items: data.allObjectTags.map((tag) => (
                {id: tag.id, name: tag.name}
              )),
            })
          }
          if (data.allPersonTags.length) {
            filterData.push({
              name: 'People',
              items: data.allPersonTags.map((tag) => (
                {id: tag.id, name: tag.name}
              )),
            })
          }
          if (data.allColorTags.length) {
            filterData.push({
              name: 'Colors',
              items: data.allColorTags.map((tag) => (
                {id: tag.id, name: tag.name}
              )),
            })
          }
          if (data.allStyleTags.length) {
            filterData.push({
              name: 'Styles',
              items: data.allStyleTags.map((tag) => (
                {id: tag.id, name: tag.name}
              )),
            })
          }
          if (data.allCameras.length) {
            filterData.push({
              name: 'Cameras',
              items: data.allCameras.map((camera) => (
                {id: camera.id, name: `${camera.make} ${camera.model}`}
              )),
            })
          }
          if (data.allLenses.length) {
            filterData.push({
              name: 'Lenses',
              items: data.allLenses.map((lens) => (
                {id: lens.id, name: lens.name}
              )),
            })
          }
          // TODO: Add these filters (possibly as sliders)
          // Aperture
          // Shutter speed

          return <Filters data={filterData} scrollbarLeft={this.state.scrollbarLeft} onToggle={onToggle} onScroll={this.onScroll} />
        }}
      </Query>
    </div>
  }
}
