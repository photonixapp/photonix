import React from 'react'
import { useForm } from 'react-hook-form'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/react-hooks'
import { Stack } from '@chakra-ui/core'

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

const Step1AdminUser = ({ hasPrevious }) => {
  const { loading, error, data } = useQuery(GET_LIBRARIES)
  const { register, handleSubmit, errors, formState } = useForm()

  if (loading) return <Spinner />
  if (error) return <p>Error :(</p>

  const onSubmit = (data) => console.log(data)

  return (
    <ModalForm
      formState={formState}
      onSubmit={handleSubmit(onSubmit)}
      hasPrevious={hasPrevious}
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
          error={errors.username}
        />
        <ModalField
          name="password"
          type="password"
          label="Password"
          required={true}
          minLength={3}
          register={register}
          error={errors.password}
        />
      </Stack>
    </ModalForm>
  )
}

export default Step1AdminUser
