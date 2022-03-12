import React, { useState, useEffect, useRef } from 'react'
import { useMutation } from '@apollo/client'
import PropTypes from 'prop-types'
import styled from '@emotion/styled'

import { CREATE_TAG, REMOVE_TAG } from '../graphql/tag'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'

const Container = styled('ul')`
  li {
    background: #444;
    display: inline-block;
    margin: 0 10px 10px 0;
    padding: 3px 10px 4px 10px;
    font-size: 14px;
    color: #ddd;
    border-radius: 4px;
    svg {
      filter: invert(0.9);
      height: 18px;
      width: 0;
      margin: 0px 0px -6px 0;
      vertical-align: 0;
      cursor: pointer;
      opacity: 0.5;
    }
    &.editing {
      padding: 3px 6px 4px 10px;
      svg {
        width: 18px;
        margin: 0px 0px -5px 4px;
        &:hover {
          opacity: 1;
        }
      }
    }
  }
  input {
    width: 100%;
    background: #383838;
    border: #383838;
    font-size: 14px;
    padding: 8px 10px;
    border-radius: 5px;
    opacity: 0.5;
    transition: opacity 500ms;
  }
`

const EditableTag = ({ tags, editorMode, photoId, refetch }) => {
  const [newTag, setNewTag] = useState('')
  const [tagsList, setTagList] = useState([])
  const [createTag] = useMutation(CREATE_TAG)
  const [removeTag] = useMutation(REMOVE_TAG)

  const ref = useRef(null)

  useEffect(() => {
    setTagList(tags)
  }, [tags])

  useEffect(() => {
    if (editorMode && ref?.current) {
      ref.current.focus()
      ref.current.parentElement.parentElement.parentElement.parentElement.parentElement.scrollTo(
        0,
        999999
      )
    }
  }, [editorMode, tagsList])

  const onHandleChange = (event) => {
    setNewTag(event.target.value)
  }

  const onHandleSubmit = (event) => {
    event.preventDefault()
    createTag({
      variables: {
        photoId,
        name: newTag,
      },
    })
      .then((tag) => {
        if (tag.data.createGenericTag.ok) {
          setNewTag('')
          refetch()
        }
      })
      .catch((e) => {})
  }

  const deleteTag = (id) => {
    removeTag({
      variables: {
        tagId: id,
        photoId,
      },
    })
      .then((res) => {
        if (res.data.removeGenericTag.ok) refetch()
      })
      .catch((e) => {})
  }

  return (
    <Container>
      {tagsList.map((photoTag) => (
        <li
          key={photoTag.tag.id}
          className={editorMode ? 'editing' : undefined}
        >
          {photoTag.tag.name}
          <CloseIcon onClick={() => deleteTag(photoTag.tag.id)} />
        </li>
      ))}

      {editorMode && (
        <form onSubmit={onHandleSubmit}>
          <input
            type="text"
            value={newTag}
            onChange={onHandleChange}
            placeholder="New tag"
            ref={ref}
            style={{ opacity: newTag.length > 0 ? 1 : 0.5 }}
          />
        </form>
      )}
    </Container>
  )
}

EditableTag.propTypes = {
  tags: PropTypes.array,
  editorMode: PropTypes.bool,
  photoId: PropTypes.string,
  refetch: PropTypes.func,
}

EditableTag.defaultProps = {
  tags: [],
  editorMode: false,
}

export default EditableTag
