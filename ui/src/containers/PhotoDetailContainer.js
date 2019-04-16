import React  from 'react'
import { Query } from "react-apollo"
import gql from "graphql-tag"
import PhotoDetail from '../components/PhotoDetail'
import Spinner from '../components/Spinner'

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
        name
      }
    }
    objectTags {
      id
      tag {
        name
      }
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
  }
}
`

export default class PhotoDetailContainer extends React.Component {
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
