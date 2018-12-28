import React  from 'react'
import { Query } from "react-apollo"
import gql from "graphql-tag"
import PhotoDetail from '../components/PhotoDetail'
import Spinner from '../components/Spinner'

const GET_PHOTO = gql`
  query Photo($id: UUID) {
    photo (id: $id) {
      url
    }
  }
`

export default class PhotoDetailContainer extends React.Component {
  render = () => {
    return (
      <Query query={GET_PHOTO} variables={{id: this.props.photoId}}>
        {({ loading, error, data }) => {
          if (loading) return <Spinner />
          if (error) return <p>Error :(</p>
          return <PhotoDetail photoId={this.props.photoId} path={data.photo.url} />
        }}
      </Query>
    )
  }
}