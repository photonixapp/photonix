import React, {useState, useEffect} from 'react'
import '../static/css/EditableTag.css'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import { useMutation } from '@apollo/react-hooks'
import {CREATE_TAG, REMOVE_TAG} from '../graphql/tag'

const EditableTag = ({tags, editorMode, photoId, refetch}) => {
  const [newTag, setNewTag] = useState('')
  const [tagsList, setTagList] = useState([])
  const [createTag] = useMutation(CREATE_TAG)
  const [removeTag] = useMutation(REMOVE_TAG)
  
  useEffect(() =>{
    setTagList(tags)
  }, [tags])

  const onHandleChange = (event) => {
    setNewTag(event.target.value)
  } 

  const onHandleSubmit = (event) => {
    event.preventDefault()
    createTag({
      variables: {
        photoId,
        name:newTag
      }
    }).then((tag) => {
      if (tag.data.createGenericTag.ok) {
        setNewTag('')
        refetch()
      }
    })
    .catch(e => {})
  }

  const deleteTag = (id) => {
    removeTag({
      variables: {
        tagId: id,
        photoId
      }
    }).then((res) => {
      if (res.data.removeGenericTag.ok)
        refetch()
    })
    .catch(e => {})
  }

  return (
    <ul className='EditableTag'>
      {tagsList.map((photoTag, index) => (
        <li key={index}>
          {photoTag.tag.name}
          {editorMode && <CloseIcon onClick={() => deleteTag(photoTag.tag.id)}/> }
        </li>
      ))}

      {editorMode &&
        <form onSubmit={onHandleSubmit}>
          <input type='text' value={newTag} onChange={onHandleChange} placeholder='New tag' />
        </form>
      }
    </ul>
  )
}

export default EditableTag
  