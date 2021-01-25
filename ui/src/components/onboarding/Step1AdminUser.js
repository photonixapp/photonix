import React from 'react'
import { useForm } from 'react-hook-form'
import { useStateMachine } from 'little-state-machine'
import { Stack } from '@chakra-ui/core'

import updateAction from './updateAction'
import Modal from './../Modal'
import ModalForm from '../ModalForm'
import ModalField from '../ModalField'

const Step1AdminUser = ({ history }) => {
  const { register, handleSubmit, errors, formState } = useForm()
  const { action, state } = useStateMachine(updateAction)

  const onPasswordChange = (e) => {
    action({ password: e.target.value })
  }

  const validatePassword = (value) => {
    if (state.data.password === value) {
      return true
    }
    return 'Password fields do not match'
  }

  return (
    <Modal
      height={700}
      topAccent={true}
      allowClose={false}
      className="Onboarding"
    >
      <ModalForm
        formState={formState}
        history={history}
        handleSubmit={handleSubmit}
        previousStep=""
        nextStep="/onboarding/step2"
      >
        <h1>Welcome to Photonix</h1>
        <div className="message">
          <p>
            Thank you for running Photonix. We’ll have you up and running very
            shortly.
          </p>
          <p>
            Firstly we need to create your user account so that access is
            secure. As this is the first account on the system it will have
            extra admin permissions for doing things like creating libraries on
            the local file system and adding additional users.
          </p>
          <p>
            You should generate a secure password and keep it stored somewhere
            safe as there is no way to recover it if you forget it.
          </p>
        </div>

        <Stack spacing={4}>
          <ModalField
            name="username"
            type="text"
            label="Username"
            required={true}
            register={register}
            errors={errors}
            defaultValue={state.data.username}
          />
          <ModalField
            name="password"
            type="password"
            label="Password"
            required={true}
            minLength={8}
            register={register}
            errors={errors}
            defaultValue={state.data.password}
            onChange={onPasswordChange}
          />
          <ModalField
            name="password1"
            type="password"
            label="Password (again)"
            required={true}
            minLength={8}
            register={register}
            errors={errors}
            defaultValue={state.data.password2}
            validate={validatePassword}
          />
        </Stack>
      </ModalForm>
    </Modal>
  )
}

export default Step1AdminUser
