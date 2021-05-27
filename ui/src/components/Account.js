import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, AlertIcon, Button, Flex } from '@chakra-ui/core'
import { useMutation } from '@apollo/client'

import ModalField from './ModalField'
import Modal from './Modal'
import { UPDATE_PASSWORD } from '../graphql/account'
import '../static/css/Account.css'
import '../static/css/Onboarding.css'

export default function Account() {
  const [data, setData] = useState({
    oldPassword: '',
    newPassword: '',
    newPassword1: '',
  })
  const [showAlert, setShowAlert] = useState(false)
  const [updatePassword] = useMutation(UPDATE_PASSWORD)
  const { register, handleSubmit, errors, formState, setError } = useForm()

  const onSubmit = (data) => {
    updatePassword({
      variables: {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      },
    })
      .then((res) => {
        if (!res.data.changePassword.ok) {
          setError('oldPassword', 'manual', "Old password doesn't match!")
        } else {
          setShowAlert(true)
        }
      })
      .catch((e) => {})
  }
  const onPasswordChange = (e) => {
    data[e.target.name] = e.target.value
    setData(data)
  }

  const validatePassword = (value) => {
    if (data.newPassword === value) {
      return true
    }
    return 'Password fields do not match'
  }

  return (
    <Modal className="Account" topAccent={true}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex direction="column" justify="space-between">
          <div>
            <h1>Account</h1>
            <h2>Change password</h2>
            {showAlert && (
              <Alert
                status="success"
                variant="solid"
                style={{ margin: '20px 0' }}
              >
                <AlertIcon />
                Password saved!
              </Alert>
            )}
            <ModalField
              name="oldPassword"
              type="password"
              label="Old password"
              required={true}
              minLength={1}
              register={register}
              errors={errors}
              defaultValue={data.oldPassword}
              onChange={onPasswordChange}
            />
            <ModalField
              name="newPassword"
              type="password"
              label="New password"
              required={true}
              minLength={8}
              register={register}
              errors={errors}
              defaultValue={data.newPassword}
              onChange={onPasswordChange}
            />
            <ModalField
              name="newPassword1"
              type="password"
              label="New password (again)"
              required={true}
              minLength={8}
              register={register}
              errors={errors}
              defaultValue={data.newPassword1}
              onChange={onPasswordChange}
              validate={validatePassword}
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
