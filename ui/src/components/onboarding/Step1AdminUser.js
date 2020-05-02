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
          It looks like you've just freshly installed as there are no users
          configured yet.
        </p>
        <p>
          It'll just take a minute to create an admin account. This can be the
          same account that you will use day-to-day but also has priviledges
          like creating libraries on the local file system and creating
          additional user accounts.
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
          minLength={3}
          register={register}
          errors={errors}
          defaultValue={state.data.username}
        />
        <ModalField
          name="password"
          type="password"
          label="Password"
          required={true}
          minLength={3}
          register={register}
          errors={errors}
          defaultValue={state.data.password}
        />
        {/* <ModalField
          name="password2"
          type="password"
          label="Password (again)"
          required={true}
          minLength={3}
          register={register}
          error={errors.password2}
        /> */}
      </Stack>
    </ModalForm>
  )
}

export default Step1AdminUser
