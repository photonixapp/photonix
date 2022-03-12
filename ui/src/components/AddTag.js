import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { Alert, AlertIcon, Button, Flex } from '@chakra-ui/core'
import { useMutation } from '@apollo/client'
import ModalField from './ModalField'
import Modal from './Modal'
import { ASSIGN_TAG_TO_PHOTOS } from '../graphql/tag'
import { isTagUpdated } from '../stores/tag/selector'
import '../static/css/Account.css'
import '../static/css/Onboarding.css'

export default function AddTag(props) {
  const [data, setData] = useState({
    tagName: '',
  })
  const [showAlert, setShowAlert] = useState(false)
  const [assignTagToPhotos] = useMutation(ASSIGN_TAG_TO_PHOTOS)
  const { register, handleSubmit, errors, formState, setError } = useForm()
  const tagUpdated = useSelector(isTagUpdated)
  const dispatch = useDispatch()

  const onSave = (data) => {
    assignTagToPhotos({
      variables: {
        name: data.tagName,
        photoIds: props.location.state.photoIds.toString(),
        tagType: props.location.state.tagType,
      },
    })
      .then((res) => {
        if (!res.data.assignTagToPhotos.ok) {
          setError('tagName', 'manual', 'Something went wrong!')
        } else {
          setShowAlert(true)
          dispatch({
            type: 'IS_TAG_UPDATE',
            payload: { updated: !tagUpdated },
          })
          // props.location.state.refetchAlbumList()
        }
      })
      .catch((e) => {})
  }

  const onChange = (e) => {
    data[e.target.name] = e.target.value
    setData(data)
  }

  return (
    <Modal className="Account" topAccent={true}>
      <form onSubmit={handleSubmit(onSave)}>
        <Flex direction="column" justify="space-between">
          <div>
            <h2>Assign Tag</h2>

            {showAlert && (
              <Alert
                status="success"
                variant="solid"
                style={{ margin: '20px 0' }}
              >
                <AlertIcon />
                Tag saved!
              </Alert>
            )}
            <ModalField
              name="tagName"
              type="text"
              label="Tag Name"
              required={true}
              minLength={2}
              register={register}
              errors={errors}
              onChange={onChange}
            />
          </div>
          <Flex justify="space-between" className="buttonBar">
            <div />
            <Button
              type="submit"
              variantColor="teal"
              variant="solid"
              isLoading={formState.isSubmitting}
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </form>
    </Modal>
  )
}
