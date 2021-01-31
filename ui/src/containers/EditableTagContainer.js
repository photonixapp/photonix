import React  from 'react'
import EditableTag from '../components/EditableTag'

export default class EditableTagContainer extends React.Component {
  constructor(props) {
    super(props)
  }

  render = () => {
    const {tags, editorMode, photoId, refetch} = this.props;

    return (
      <>
        <EditableTag tags={tags} editorMode={editorMode} photoId={photoId} refetch={refetch} />
      </>
    )
  }
}