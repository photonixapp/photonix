import React  from 'react'
import createHistory from 'history/createBrowserHistory'
import { Query } from "react-apollo"
import gql from "graphql-tag"

import PhotoDetail from '../components/PhotoDetail'
import Spinner from '../components/Spinner'

const history = createHistory()

const ESCAPE_KEY = 27
const BACKSPACE_KEY = 8

const GET_PHOTO = gql`
query Photo($id: UUID) {
  photo(id: $id) {
    id
    takenAt
    takenBy
    aperture
    exposure
    isoSpeed
    focalLength
    flash
    meteringMode
    driveMode
    shootingMode
    camera {
      id
      make
      model
    }
    lens {
      id
      name
    }
    location
    altitude
    url
    locationTags {
      id
      tag {
        id
        name
        parent {
          id
        }
      }
    }
    objectTags {
      id
      tag {
        name
      }
      positionX
      positionY
      sizeX
      sizeY
    }
    colorTags {
      id
      tag {
        name
      }
    }
    styleTags {
      id
      tag {
        name
      }
    }
    width
    height
  }
}
`

export default class PhotoDetailContainer extends React.Component {
  componentDidMount = () => {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount = () => {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (event) => {
    switch (event.keyCode) {
      case ESCAPE_KEY:
      case BACKSPACE_KEY:
        history.goBack()
        break
      default:
        break
    }
  }

  render = () => {
    return (
      <Query query={GET_PHOTO} variables={{id: this.props.match.params.photoId}}>
        {({ loading, error, data }) => {
          if (loading) return <Spinner />
          if (error) return <p>Error :(</p>
          return <PhotoDetail photoId={this.props.match.params.photoId} photo={data.photo} />
        }}
      </Query>
    )
  }
}
