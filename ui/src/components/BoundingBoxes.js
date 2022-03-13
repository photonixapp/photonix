import React, { useEffect, useRef } from 'react'
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
    .FeatureLabelContainer {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      .FeatureLabel {
        color: #fff;
        font-size: 14px;
        background-color: rgba(255, 0, 0, 0.5);
        border-top-left-radius: 3px;
        overflow: hidden;
        max-width: 100%;
        padding: 1px 4px;
        float: left;
        text-align: left;
        white-space: nowrap;
        pointer-events: all;
      }
    }
    &.face {
      cursor: default;
      overflow: visible;
      &.yellowBox {
        border-color: rgba(255, 255, 0, 0.75);
        .FeatureLabel {
          color: #000;
          background-color: rgba(255, 255, 0, 0.5);
        }
      }
      &.greenBox {
        border-color: rgba(0, 255, 0, 0.75);
        .FeatureLabel {
          color: #000;
          background-color: rgba(0, 255, 0, 0.5);
        }
      }
      &.whiteBox {
        border-color: rgba(202, 202, 191, 0.5);
        .FeatureLabel {
          color: #000;
          background-color: rgba(202, 202, 191, 0.5);
        }
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
    &.hideBox {
      border: none;
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
const ENTER_KEY = 13
const ESCAPE_KEY = 27

const BoundingBoxes = ({
  boxes,
  className,
  refetch,
  showBoundingBox,
  editLableId,
  setEditLableId,
  rotation,
}) => {
  const dispatch = useDispatch()
  const ref = useRef(null)
  const [editFaceTag] = useMutation(EDIT_FACE_TAG)
  const [blockFaceTag] = useMutation(BLOCK_FACE_TAG)
  const [verifyPhoto] = useMutation(VERIFY_FACE_TAG)
  const tagUpdated = useSelector(isTagUpdated)

  const onHandleBlock = (event, photoTagId) => {
    stopParentEventBehavior(event)
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

  const onSaveLable = (event, photoTagId) => {
    stopParentEventBehavior(event)
    editFaceTag({
      variables: {
        photoTagId: photoTagId,
        newName: ref.current.value,
      },
    })
      .then((res) => {
        setEditLableId('')
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
      })
  }

  const onChangeLable = (event, photoTagId) => {
    ;(event.keyCode === ENTER_KEY &&
      ref.current.value &&
      onSaveLable(event, photoTagId)) ||
      (event.keyCode === ESCAPE_KEY && setEditLableId(''))
  }

  const setVerifyPhoto = (event, photoTagId) => {
    stopParentEventBehavior(event)
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

  const updateEditState = (event, boxId) => {
    stopParentEventBehavior(event)
    setEditLableId(boxId)
  }

  const stopParentEventBehavior = (event) => {
    event.stopPropagation()
  }

  const featureLabelContainerStyles = (id) => {
    let styles = {
      transform: `rotate(${360 - rotation}deg)`,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    }

    let borderWidth = 1
    if (window.innerWidth > 1000) {
      borderWidth = 3
    }

    let box = document.getElementById('box-' + id)
    if (!box) {
      return styles
    }

    if (rotation === 0 || rotation === 180) {
      styles.width = box.offsetWidth - 2 * borderWidth
      styles.height = box.offsetHeight - 2 * borderWidth
    } else {
      styles.width = box.offsetHeight - 2 * borderWidth
      styles.height = box.offsetWidth - 2 * borderWidth
      styles.top = (styles.width - styles.height) / 2
      styles.left = styles.top * -1
    }

    return styles
  }

  return (
    <Container>
      {boxes?.map((box, index) => {
        let left = (box.positionX - box.sizeX / 2) * 100 + '%'
        let top = (box.positionY - box.sizeY / 2) * 100 + '%'
        let width = box.sizeX * 100 + '%'
        let height = box.sizeY * 100 + '%'
        return (
          <div
            className={`FeatureBox ${className} ${
              showBoundingBox ? box.boxColorClass : 'hideBox'
            }`}
            key={index}
            id={`box-${box.id}`}
            style={{ left: left, top: top, width: width, height: height }}
          >
            {showBoundingBox && (
              <div
                className="FeatureLabelContainer"
                style={featureLabelContainerStyles(box.id)}
              >
                {editLableId === box.id ? (
                  <input
                    type="text"
                    name="tagName"
                    className="FeatureEditText"
                    onKeyDown={(e) => onChangeLable(e, box.id)}
                    ref={ref}
                    onMouseDown={(e) => stopParentEventBehavior(e)}
                    onClick={(e) => stopParentEventBehavior(e)}
                  />
                ) : (
                  !box.deleted && (
                    <div className="FeatureLabel" key={index}>
                      {box.name}
                    </div>
                  )
                )}
                {className === 'face' && (
                  <div className="icons">
                    {editLableId === box.id ? (
                      <DoneIcon
                        alt="Done"
                        className="FeatureIconDone"
                        onClick={(e) => onSaveLable(e, box.id)}
                      />
                    ) : (
                      <>
                        {!box.verified && !box.deleted && (
                          <BlockIcon
                            alt="Block"
                            className="FeatureIconDelete"
                            onClick={(e) => onHandleBlock(e, box.id)}
                            title="Reject automatic face tag"
                          />
                        )}
                        {box.showVerifyIcon && !box.deleted && (
                          <DoneIcon
                            alt="Done"
                            className="FeatureIconDone"
                            onClick={(e) => setVerifyPhoto(e, box.id)}
                            title="Approve automatic face tag"
                          />
                        )}
                        <EditIcon
                          alt="Edit"
                          className="FeatureIconEdit"
                          onClick={(e) => updateEditState(e, box.id)}
                          title="Edit person’s name"
                        />
                      </>
                    )}
                  </div>
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
