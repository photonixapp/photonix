import React, { useState, useEffect, useRef } from 'react'
import styled from '@emotion/styled'
import { useMutation } from '@apollo/client'
import { useDispatch, useSelector } from 'react-redux'
import { ReactComponent as EditIcon } from '../static/images/edit.svg'
import { ReactComponent as BlockIcon } from '../static/images/block_black.svg'
import { ReactComponent as DoneIcon } from '../static/images/done_black.svg'
import { EDIT_FACE_TAG, BLOCK_FACE_TAG, VERIFY_FACE_TAG } from '../graphql/tag'
import { isTagUpdated } from '../stores/tag/selector'

const Container = styled('div')`
  width: 100%;
  height: 100%;
  position: relative;

  .FeatureBox {
    border: 3px solid rgba(255, 0, 0, 0.75);
    position: absolute;
    border-radius: 6px;
    overflow: hidden;
    .FeatureLabel {
      color: #fff;
      font-size: 14px;
      background-color: rgba(255, 0, 0, 0.75);
      display: inline-block;
      overflow: hidden;
      max-width: 100%;
      padding: 1px 7px 2px 4px;
      float: left;
      text-align: left;
      white-space: nowrap;
      pointer-events: all;
    }
    &.face {
      cursor: default;
      overflow: visible;
      &.yellowBox {
        border-color: rgba(255, 255, 0, 0.75);
        .FeatureLabel {
          color: #000;
          background-color: rgba(255, 255, 0, 0.75);
        }
      }
      &.greenBox {
        border-color: rgba(0, 255, 0, 0.75);
        .FeatureLabel {
          color: #000;
          background-color: rgba(0, 255, 0, 0.75);
        }
      }
      &.whiteBox {
        border-color: rgba(202, 202, 191, 0.5);
      }
      .FeatureEditText {
        color: #000 !important;
        width: 100%;
        border: 0;
        padding: 2px 4px;
      }
      .icons {
        position: absolute;
        bottom: -2px;
        right: 2px;
        width: max-content;

        svg {
          background: #fff;
          border-radius: 50%;
          padding: 3px;
          margin: 0 1px;
          cursor: pointer;
          &.FeatureIconEdit {
          }
          &.FeatureIconDelete {
            background: #f00;
          }
          &.FeatureIconDone {
            background: #0f0;
          }
        }
      }
    }
  }

  @media all and (max-width: 1000px) {
    .FeatureBox {
      border-width: 1px;
      .FeatureLabel {
        font-size: 8px;
        padding: 0 3px 1px 3px;
      }
    }
  }
`
const BoundingBoxes = ({ boxes, className, refetch }) => {
  const dispatch = useDispatch()
  const ref = useRef(null)
  const [editLableId, setEditLableId] = useState('')
  const [tagName, setTagName] = useState(null)
  const [editFaceTag] = useMutation(EDIT_FACE_TAG)
  const [blockFaceTag] = useMutation(BLOCK_FACE_TAG)
  const [verifyPhoto] = useMutation(VERIFY_FACE_TAG)
  const tagUpdated = useSelector(isTagUpdated)

  const onHandleBlock = (photoTagId) => {
    blockFaceTag({
      variables: {
        photoTagId: photoTagId,
      },
    })
      .then((res) => {
        if (res.data.blockFaceTag.ok) {
          refetch()
          dispatch({
            type: 'IS_TAG_UPDATE',
            payload: { updated: !tagUpdated },
          })
        }
      })
      .catch((e) => {})
  }

  const onSaveLable = (photoTagId) => {
    editFaceTag({
      variables: {
        photoTagId: photoTagId,
        newName: tagName,
      },
    })
      .then((res) => {
        setEditLableId('')
        setTagName(null)
        if (res.data.editFaceTag.ok) {
          refetch()
          dispatch({
            type: 'IS_TAG_UPDATE',
            payload: { updated: !tagUpdated },
          })
        }
      })
      .catch((e) => {
        setEditLableId('')
        setTagName(null)
      })
  }

  const onChangeLable = (event, photoTagId) => {
    setTagName(event.target.value)
    if (event.keyCode === 13) {
      if (tagName) {
        onSaveLable(photoTagId)
      } else {
        setEditLableId('')
        setTagName(null)
      }
    }
  }

  const setVerifyPhoto = (photoTagId) => {
    verifyPhoto({
      variables: {
        photoTagId: photoTagId,
      },
    })
      .then((res) => {
        if (res.data.verifyPhoto.ok) refetch()
      })
      .catch((e) => {})
  }

  useEffect(() => {
    if (ref?.current) {
      ref.current.focus()
    }
  }, [editLableId])

  return (
    <Container>
      {boxes?.map((box, index) => {
        let left = (box.positionX - box.sizeX / 2) * 100 + '%'
        let top = (box.positionY - box.sizeY / 2) * 100 + '%'
        let width = box.sizeX * 100 + '%'
        let height = box.sizeY * 100 + '%'
        return (
          <div
            className={`FeatureBox ${className} ${box.boxColorClass}`}
            key={index}
            style={{ left: left, top: top, width: width, height: height }}
          >
            {!box.deleted ? (
              editLableId === box.id ? (
                <input
                  type="text"
                  name="tagName"
                  className="FeatureEditText"
                  onKeyUp={(e) => onChangeLable(e, box.id)}
                  ref={ref}
                />
              ) : (
                <div className="FeatureLabel" key={index}>
                  {box.name}
                </div>
              )
            ) : null}
            {className === 'face' && !box.deleted && (
              <div className="icons">
                {editLableId === box.id ? (
                  <DoneIcon
                    alt="Done"
                    className="FeatureIconDone"
                    onClick={() => onSaveLable(box.id)}
                  />
                ) : (
                  <>
                    {!box.verified && (
                      <BlockIcon
                        alt="Block"
                        className="FeatureIconDelete"
                        onClick={() => onHandleBlock(box.id)}
                        title="Reject automatic face tag"
                      />
                    )}
                    {box.showVerifyIcon && (
                      <DoneIcon
                        alt="Done"
                        className="FeatureIconDone"
                        onClick={() => setVerifyPhoto(box.id)}
                        title="Approve automatic face tag"
                      />
                    )}
                    <EditIcon
                      alt="Edit"
                      className="FeatureIconEdit"
                      onClick={() => setEditLableId(box.id)}
                      title="Edit person’s name"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </Container>
  )
}

export default BoundingBoxes
