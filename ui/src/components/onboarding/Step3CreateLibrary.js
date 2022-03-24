import React from 'react'
import { useForm } from 'react-hook-form'
import { useStateMachine } from 'little-state-machine'
import { Stack } from '@chakra-ui/core'

import updateAction from './updateAction'
import Modal from './../Modal'
import ModalForm from '../ModalForm'
import ModalField from '../ModalField'

const Step3CreateLibrary = ({ history }) => {
  const { register, handleSubmit, errors, formState } = useForm()
  const { action, state } = useStateMachine(updateAction)

  const onFieldChange = (e, name) => {
    action({ [name]: e.target.value })
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
        previousStep="/onboarding/step2"
        nextStep="/onboarding/step4"
      >
        <h1>Create a library</h1>
        <div className="message">
          <p>
            Next we need to create a Library to store your photos in. Later on
            you’ll be able to collaborate on this library with others such as
            family members or colleagues.
          </p>
          <p>
            A key thing that defines a library is where all the photo files are
            going to be stored – whether that be on a hard drive in the current
            machine, in the cloud or somewhere in-between.
          </p>
          <p>
            You may only ever need to create one library if you are going to be
            the sole user of the system or you and the other users will all
            share the same space. However, if you want a personal library and
            one that you collaborate with other people on, you can add a second
            library later.
          </p>
        </div>

        <Stack spacing={4} mb={4}>
          <ModalField
            name="name"
            type="text"
            label="Library name"
            required={true}
            minLength={3}
            register={register}
            errors={errors}
            defaultValue={state.data.libraryName}
          />
          <ModalField
            name="backendType"
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
              // {
              //   value: 'S3',
              //   label: 'S3-compatible',
              // },
            ]}
            onChange={(e) => onFieldChange(e, 'storageBackend')}
          />
        </Stack>

        {state.data.storageBackend === 'Lo' && (
          <Stack spacing={4}>
            <p>
              Leave base path as the default unless you have configured multiple
              volumes for multiple libraries. The base path will need to be
              writeable so that we can put new files here, and also needs to be
              large enough to store your whole collection. If you’re running in
              a container, feel free to restart it with new mounted volumes if
              you need to.
            </p>
            <ModalField
              name="basePath"
              type="text"
              label="Base path"
              required={true}
              register={register}
              errors={errors}
              defaultValue={
                state?.data?.basePath ? state.data.basePath : '/data/photos/'
              }
            />
          </Stack>
        )}

        {state.data.storageBackend === 'S3' && (
          <>
            <Stack spacing={4}>
              <ModalField
                name="storageS3Server"
                type="text"
                label="Server"
                required={true}
                register={register}
                errors={errors}
                defaultValue={state.data.storageS3Server}
                onChange={(e) => onFieldChange(e, 'storageS3Server')}
              />
              <ModalField
                name="storageS3Bucket"
                type="text"
                label="Bucket"
                required={true}
                register={register}
                errors={errors}
                defaultValue={state.data.storageS3Bucket}
                onChange={(e) => onFieldChange(e, 'storageS3Bucket')}
              />
              <ModalField
                name="storageS3Path"
                type="text"
                label="Path"
                required={true}
                register={register}
                errors={errors}
                defaultValue={state.data.storageS3Path}
                onChange={(e) => onFieldChange(e, 'storageS3Path')}
              />
              {state.data.storageS3Server && (
                <p className="storageS3Preview">
                  {state.data.storageS3Server}/{state.data.storageS3Bucket}/
                  {state.data.storageS3Path}
                </p>
              )}
              <p>
                If your bucket has public read permissions, entering the base
                HTTP URL here will speed up display of images as the client
                browser will be able to access the images directly (bypassing
                the server). You are responsible for permissions of your bucket
                so don’t make it public unless you are sure that’s what you
                want.
              </p>
              <ModalField
                name="url"
                type="text"
                label="Publicly accessible URL base path"
                register={register}
                errors={errors}
                defaultValue={state.data.storagePublicBaseUrl}
              />
              <p>
                In a minute we’ll check your bucket is accessible and writeable
                so we'll need these keys please.
              </p>
              <ModalField
                name="s3AccessKeyId"
                type="text"
                label="Access key"
                required={true}
                register={register}
                errors={errors}
                minLength={20}
                defaultValue={state.data.storageS3AccessKey}
              />
              <ModalField
                name="s3SecretKey"
                type="text"
                label="Secret key"
                required={true}
                register={register}
                errors={errors}
                minLength={40}
                defaultValue={state.data.storageS3SecretKey}
              />
            </Stack>
          </>
        )}
      </ModalForm>
    </Modal>
  )
}

export default Step3CreateLibrary
