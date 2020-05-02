import React from 'react'
import { useForm } from 'react-hook-form'
import { useStateMachine } from 'little-state-machine'
import { Stack } from '@chakra-ui/core'

import updateAction from './updateAction'
import ModalForm from '../ModalForm'
import ModalField from '../ModalField'

const Step3CrateLibrary = ({ history }) => {
  const { register, handleSubmit, errors, formState } = useForm()
  const { action, state } = useStateMachine(updateAction)

  return (
    <ModalForm
      formState={formState}
      history={history}
      handleSubmit={handleSubmit}
      previousStep="/onboarding/step2"
      nextStep="/onboarding/result"
    >
      <h2>Create a library</h2>
      <div className="message">
        <p>
          For Photonix to be of any use to you, you need a Library to store your
          photos in. You'll be able to share this library with others later on,
          be they family members or colleagues.
        </p>
        <p>
          A key thing that defines a library is where all those lovely photos
          are going to be stored.
        </p>
        <p>
          You may only ever need to create one library if you are going to be
          the sole user of the system or you and the other users will all share
          the same space. However, if you want a personal library and one that
          you collaborate with other people on, you can add a second library
          later.
        </p>
        <p>So, go on, create your first library.</p>
      </div>

      <Stack spacing={4}>
        <ModalField
          name="libraryName"
          type="text"
          label="Library name"
          required={true}
          minLength={3}
          register={register}
          errors={errors}
          defaultValue={state.data.libraryName}
        />
        <ModalField
          name="storageBackend"
          type="select"
          label="Storage backend"
          required={true}
          register={register}
          errors={errors}
          defaultValue={state.data.storageBackend}
          selectOptions={[
            {
              value: 'Lo',
              label: 'Local',
            },
            {
              value: 'S3',
              label: 'S3-compatible',
            },
          ]}
        />
      </Stack>
    </ModalForm>
  )
}

export default Step3CrateLibrary
