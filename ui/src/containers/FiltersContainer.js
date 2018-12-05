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
    allApertures
    allExposures
    allIsoSpeeds
    allFocalLengths
    allMeteringModes
    allDriveModes
    allShootingModes
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

  createTagSection(sectionName, data, tagPrefix='tag') {
    return {
      name: sectionName,
      items: data.map((tag) => {
        if (tag.toString() === '[object Object]') {
          return {id: tagPrefix + ':' + tag.id, name: tag.name}
        }
        return {id: tagPrefix + ':' + tag, name: tag}
      }),
    }
  }

  render() {
    return <div>
      <Query query={GET_FILTERS}>
        {({ loading, error, data }) => {
          if (loading) return <Spinner />
          if (error) return <p>Error :(</p>

          let filterData = []
          if (data.allObjectTags.length) {
            filterData.push(this.createTagSection('Objects', data.allObjectTags))
          }
          if (data.allLocationTags.length) {
            filterData.push(this.createTagSection('Locations', data.allLocationTags))
          }
          if (data.allPersonTags.length) {
            filterData.push(this.createTagSection('People', data.allPersonTags))
          }
          if (data.allColorTags.length) {
            filterData.push(this.createTagSection('Colors', data.allColorTags))
          }
          if (data.allStyleTags.length) {
            filterData.push(this.createTagSection('Styles', data.allStyleTags))
          }
          if (data.allCameras.length) {
            filterData.push({
              name: 'Cameras',
              items: data.allCameras.map((camera) => (
                {id: 'camera:' + camera.id, name: `${camera.make} ${camera.model}`}
              )),
            })
          }
          if (data.allLenses.length) {
            filterData.push(this.createTagSection('Lenses', data.allLenses))
          }
          if (data.allApertures.length) {
            filterData.push(this.createTagSection('Aperture', data.allApertures))
          }
          if (data.allExposures.length) {
            filterData.push(this.createTagSection('Exposure', data.allExposures))
          }
          if (data.allIsoSpeeds.length) {
            filterData.push(this.createTagSection('ISO Speed', data.allIsoSpeeds))
          }
          if (data.allFocalLengths.length) {
            filterData.push(this.createTagSection('Focal Length', data.allFocalLengths))
          }
          filterData.push({
            name: 'Flash',
            items: [{id: 'flash:on', name: 'On'}, {id: 'flash:off', name: 'Off'}]
          })
          if (data.allMeteringModes.length) {
            filterData.push(this.createTagSection('Metering Mode', data.allMeteringModes))
          }
          if (data.allDriveModes.length) {
            filterData.push(this.createTagSection('Drive Mode', data.allDriveModes))
          }
          if (data.allShootingModes.length) {
            filterData.push(this.createTagSection('Shooting Mode', data.allShootingModes))
          }

          return <Filters data={filterData} scrollbarLeft={this.state.scrollbarLeft} onToggle={this.props.onToggle} onScroll={this.onScroll} />
        }}
      </Query>
    </div>
  }
}
