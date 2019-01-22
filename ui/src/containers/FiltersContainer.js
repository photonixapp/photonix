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
const SCROLLBAR_WIDTH = 220

export default class FiltersContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      scrollbarLeft: PADDING,
    }

    this.containerRef = React.createRef()
    this.mouseDownStart = 0
    this.dragOffset = 0
    this.viewportWidth = 0
    this.contentWidth = 0
    this.contentScrollDistance = 0
    this.displayScrollbar = false
  }

  componentDidUpdate() {
    if (this.containerRef.current) {
      this.viewportWidth = this.containerRef.current.parentElement.clientWidth + (PADDING * 2)
      this.contentWidth = this.containerRef.current.firstChild.clientWidth + PADDING
      this.contentScrollDistance = this.contentWidth - this.viewportWidth
      this.scrollbarScrollAvailable = this.viewportWidth - SCROLLBAR_WIDTH - PADDING - 20
    }
  }

  viewportOffsetToScrollbarOffset = (viewportOffset) => {
    const scrollProgress = viewportOffset / this.contentScrollDistance
    const left = parseInt(scrollProgress * this.scrollbarScrollAvailable + PADDING, 10)
    return left
  }

  scrollbarOffsetToViewportOffset = (scrollbarOffset) => {
    const scrollProgress = scrollbarOffset / this.scrollbarScrollAvailable
    const left = parseInt(scrollProgress * this.contentScrollDistance, 10)
    return left
  }

  onScroll = (e) => {
    const left = this.viewportOffsetToScrollbarOffset(e.currentTarget.scrollLeft)
    this.setState({scrollbarLeft: left})
  }

  onMouseDown = (e) => {
    e.preventDefault()
    this.mouseDownStart = e.clientX
    this.scrollbarStart = this.state.scrollbarLeft | 0
    document.onmouseup = this.scrollbarRelease
    document.onmousemove = this.scrollbarDrag
    this.setState({displayScrollbar: true})
  }

  scrollbarRelease = () => {
    document.onmouseup = null
    document.onmousemove = null
    this.setState({displayScrollbar: false})
  }

  scrollbarDrag = (e) => {
    e.preventDefault()
    this.dragOffset = e.clientX - (this.mouseDownStart - this.scrollbarStart) - PADDING
    const left = this.scrollbarOffsetToViewportOffset(this.dragOffset)
    this.containerRef.current.scrollLeft = left
  }

  createFilterSelection(sectionName, data, prefix='tag') {
    return {
      name: sectionName,
      items: data.map((tag) => {
        if (tag.toString() === '[object Object]') {
          return {id: prefix + ':' + tag.id, name: tag.name}
        }
        return {id: prefix + ':' + tag, name: tag}
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
            filterData.push(this.createFilterSelection('Objects', data.allObjectTags))
          }
          if (data.allLocationTags.length) {
            filterData.push(this.createFilterSelection('Locations', data.allLocationTags))
          }
          if (data.allPersonTags.length) {
            filterData.push(this.createFilterSelection('People', data.allPersonTags))
          }
          if (data.allColorTags.length) {
            filterData.push(this.createFilterSelection('Colors', data.allColorTags))
          }
          if (data.allStyleTags.length) {
            filterData.push(this.createFilterSelection('Styles', data.allStyleTags))
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
            filterData.push(this.createFilterSelection('Lenses', data.allLenses, 'lens'))
          }
          if (data.allApertures.length) {
            filterData.push(this.createFilterSelection('Aperture', data.allApertures, 'aperture'))
          }
          if (data.allExposures.length) {
            filterData.push(this.createFilterSelection('Exposure', data.allExposures, 'exposure'))
          }
          if (data.allIsoSpeeds.length) {
            filterData.push(this.createFilterSelection('ISO Speed', data.allIsoSpeeds, 'isoSpeed'))
          }
          if (data.allFocalLengths.length) {
            filterData.push(this.createFilterSelection('Focal Length', data.allFocalLengths, 'focalLength'))
          }
          filterData.push({
            name: 'Flash',
            items: [{id: 'flash:on', name: 'On'}, {id: 'flash:off', name: 'Off'}]
          })
          if (data.allMeteringModes.length) {
            filterData.push(this.createFilterSelection('Metering Mode', data.allMeteringModes, 'meeteringMode'))
          }
          if (data.allDriveModes.length) {
            filterData.push(this.createFilterSelection('Drive Mode', data.allDriveModes, 'driveMode'))
          }
          if (data.allShootingModes.length) {
            filterData.push(this.createFilterSelection('Shooting Mode', data.allShootingModes, 'shootingMode'))
          }

          return <Filters
            data={filterData}
            scrollbarLeft={this.state.scrollbarLeft}
            onToggle={this.props.onToggle}
            onScroll={this.onScroll}
            onMouseDown={this.onMouseDown}
            containerRef={this.containerRef}
            displayScrollbar={this.state.displayScrollbar} />
        }}
      </Query>
    </div>
  }
}
