import React from 'react'
import { useForm } from 'react-hook-form'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/react-hooks'
import { useStateMachine } from 'little-state-machine'
import { Stack } from '@chakra-ui/core'

import updateAction from './updateAction'
import ModalForm from '../ModalForm'
import ModalField from '../ModalField'
import Spinner from '../Spinner'

const GET_LIBRARIES = gql`
  {
    allLibraries {
      id
      name
    }
  }
`

const Step1AdminUser = ({ history }) => {
  const { loading, error, data } = useQuery(GET_LIBRARIES)
  const { register, handleSubmit, errors, formState } = useForm()
  const { action, state } = useStateMachine(updateAction)

  if (loading) return <Spinner />
  if (error) return <p>Error :(</p>

  const onPasswordChange = (e) => {
    action({ password: e.target.value })
  }

  const validatePassword = (value) => {
    if (state.data.password == value) {
      return true
    }
    return 'Password fields do not match'
  }

  return (
    <ModalForm
      formState={formState}
      history={history}
      handleSubmit={handleSubmit}
      previousStep=""
      nextStep="/onboarding/step2"
    >
      <h2>Welcome to Photonix</h2>
      <div className="message">
        <p>
          Thank you for running Photonix. We’ll have you up and running very
          shortly.
        </p>
        <p>
          Firstly we need to create your user account so that access is secure.
          As this is the first account on the system it will have extra admin
          permissions for doing things like creating libraries on the local file
          system and adding additional users.
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
          name="password2"
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
  )
}

export default Step1AdminUser
