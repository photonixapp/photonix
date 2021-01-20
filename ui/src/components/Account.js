import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Stack } from '@chakra-ui/core'

import '../static/css/Account.css'
import history from '../history'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import ModalField from './ModalField'
import '../static/css/Onboarding.css'
import { useMutation } from '@apollo/react-hooks'
import {UPDATE_PASSWORD} from '../graphql/account'

export default function Account() {
  const [data, setData] = useState({oldPassword: '', newPassword: '', newPassword1: ''})
  const [authUser] = useMutation(UPDATE_PASSWORD)
  const { register, handleSubmit, errors, formState } = useForm()
  const onSubmit = data => {
    console.log(data);
  }
  const onPasswordChange = (e) => {
    console.log(e.target.value)
    data[e.target.name] = e.target.value
    setData(data)
  }

  const validatePassword = (value) => {
    console.log(data, value)
    if (data.newPassword === value) {
      return true
    }
    return 'Password fields do not match'
  }

  return (
    <div className="Account">
      <span onClick={history.goBack}>
        <CloseIcon className="closeIcon" alt="Close" />
      </span>
      <h1>Account</h1>
      <h2>Change password</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalField
          name="oldPassword"
          type="password"
          label="Old password"
          required={true}
          minLength={8}
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
        <Button
          type="submit"
          variantColor="teal"
          variant="solid"
          isLoading={formState.isSubmitting}
        >
          Save
        </Button>
      </form>
    </div>
  )
}