import React from 'react'
import { useForm } from 'react-hook-form'
import { useStateMachine } from 'little-state-machine'
import { Stack } from '@chakra-ui/core'

import updateAction from './updateAction'
import Modal from './../Modal'
import ModalForm from '../ModalForm'
import ModalField from '../ModalField'

const Step5Search = ({ history }) => {
  const { register, handleSubmit, errors, formState } = useForm()
  const { state } = useStateMachine(updateAction)

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
        previousStep="/onboarding/step4"
        nextStep="/onboarding/result"
      >
        <h1>Image analysis</h1>

        <div className="message">
          <p>
            We’re very proud of our search features. You may have seen that we
            can do things like use AI to detect and tag objects, locations,
            styles, colours and so on. All of this processing happens on the
            current server so your photos won’t be sent to the cloud but it will
            use a fair amount of system resources like CPU, RAM and disk.
          </p>
          <p>
            If you are starting off your library with a lot of photos or if you
            upload a load of photos in one go, it will take a while to complete
            the analysis before everything is fully searchable. We try to make
            sure this processing doesn’t affect the performance of the rest of
            the system but in some cases it may be that the hardware is just too
            underpowered. You will always be able to turn different types of
            analysis on or off later on.
          </p>
        </div>

        <Stack spacing={4}>
          <ModalField
            name="classificationColorEnabled"
            type="boolean"
            label="Color analysis (fast)"
            register={register}
            errors={errors}
            defaultValue={
              state?.data?.classificationColorEnabled
                ? state.data.classificationColorEnabled
                : true
            }
          />
          <ModalField
            name="classificationLocationEnabled"
            type="boolean"
            label="Location identification (fast)"
            register={register}
            errors={errors}
            defaultValue={
              state?.data?.classificationLocationEnabled
                ? state.data.classificationLocationEnabled
                : true
            }
          />
          <ModalField
            name="classificationFaceEnabled"
            type="boolean"
            label="Face recognition (medium)"
            register={register}
            errors={errors}
            defaultValue={
              state?.data?.classificationFaceEnabled
                ? state.data.classificationFaceEnabled
                : true
            }
          />
          <ModalField
            name="classificationStyleEnabled"
            type="boolean"
            label="Style recognition (medium)"
            register={register}
            errors={errors}
            defaultValue={
              state?.data?.classificationStyleEnabled
                ? state.data.classificationStyleEnabled
                : true
            }
          />
          <ModalField
            name="classificationObjectEnabled"
            type="boolean"
            label="Object detection (slow)"
            register={register}
            errors={errors}
            defaultValue={
              state?.data?.classificationObjectEnabled
                ? state.data.classificationObjectEnabled
                : true
            }
          />
        </Stack>
      </ModalForm>
    </Modal>
  )
}

export default Step5Search
