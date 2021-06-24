import React, { useEffect, useState } from 'react'
import { useStateMachine } from 'little-state-machine'
import { Flex, Button } from '@chakra-ui/core'
import { useMutation, useQuery } from '@apollo/client'
import {
  ENVIRONMENT,
  STEP_ONE,
  STEP_THREES3,
  STEP_THREELO,
  STEP_FOUR_AP,
  STEP_FOUR,
  STEP_FIVE,
} from '../graphql/onboarding'
import updateAction from './onboarding/updateAction'

const ModalForm = ({
  children,
  formState,
  history,
  handleSubmit,
  previousStep,
  nextStep,
}) => {
  const [envData, setData] = useState()
  const { data, refetch } = useQuery(ENVIRONMENT)
  useEffect(() => {
    refetch()
    setData(data)
  }, [data, refetch])

  const setUserData = (data) => {
    localStorage.setItem('userData', data.userId)
  }
  const setUserLib = (data) => {
    localStorage.setItem('userLibraryId', data.libraryId)
    localStorage.setItem('userlibraryPathId', data.libraryPathId)
  }

  const clearLocalData = () => {
    localStorage.removeItem('userLibraryId')
    localStorage.removeItem('userlibraryPathId')
    localStorage.removeItem('userData')
  }
  const { action } = useStateMachine(updateAction)
  const [stepOneRegistration] = useMutation(STEP_ONE)
  const [stepThreeRegistrationS3] = useMutation(STEP_THREES3)
  const [stepThreeRegistrationLo] = useMutation(STEP_THREELO)
  const [stepFourRegistrationAp] = useMutation(STEP_FOUR_AP)
  const [stepFourRegistration] = useMutation(STEP_FOUR)
  const [stepFiveRegistration] = useMutation(STEP_FIVE)
  const onSubmit = (data) => {
    if (nextStep === '/onboarding/step2') {
      localStorage.setItem("isSignin", false);
      stepOneRegistration({
        variables: {
          username: data.username,
          password: data.password,
          password1: data.password1,
        },
      })
        .then((data) => {
          setUserData(data.data.createUser)
        })
        .catch((e) => {})
    }
    if (nextStep === '/onboarding/step4') {
      const userId = localStorage.getItem('userData')
      if (data.backendType === 'S3') {
        stepThreeRegistrationS3({
          variables: {
            name: data.name,
            backendType: data.backendType,
            path: `${data.storageS3Server}/${data.storageS3Bucket}/${data.storageS3Path}`,
            url: data.url,
            s3SecretKey: data.s3SecretKey,
            s3AccessKeyId: data.s3AccessKeyId,
            userId: userId ? userId : envData.environment.userId,
          },
        })
          .then((data) => {
            setUserLib(data.data.createLibrary)
          })
          .catch((e) => {})
      } else {
        stepThreeRegistrationLo({
          variables: {
            name: data.name,
            backendType: data.backendType,
            path: data.basePath,
            userId: userId ? userId : envData.environment.userId,
          },
        })
          .then((data) => {
            setUserLib(data.data.createLibrary)
          })
          .catch((e) => {})
      }
    }
    if (nextStep === '/onboarding/step5') {
      const LibraryId = localStorage.getItem('userLibraryId')
      const LibraryPathId = localStorage.getItem('userlibraryPathId')
      if (!data.addAnotherPath) {
        stepFourRegistration({
          variables: {
            addAnotherPath: data.addAnotherPath,
            watchForChanges: data.watchForChanges,
            userId: envData.environment.userId,
            libraryId: LibraryId ? LibraryId : envData.environment.libraryId,
            libraryPathId: LibraryPathId
              ? LibraryPathId
              : envData.environment.libraryPathId,
          },
        }).catch((e) => {})
      } else {
        stepFourRegistrationAp({
          variables: {
            watchForChanges: data.watchForChanges,
            addAnotherPath: data.addAnotherPath,
            importPath: data.importPath,
            deleteAfterImport: data.deleteAfterImport,
            userId: envData.environment.userId,
            libraryId: LibraryId ? LibraryId : envData.environment.libraryId,
            libraryPathId: LibraryPathId
              ? LibraryPathId
              : envData.environment.libraryPathId,
          },
        }).catch((e) => {})
      }
    }
    if (nextStep === '/onboarding/result') {
      const LibraryId = localStorage.getItem('userLibraryId')
      stepFiveRegistration({
        variables: {
          classificationColorEnabled: data.classificationColorEnabled,
          classificationStyleEnabled: data.classificationStyleEnabled,
          classificationObjectEnabled: data.classificationObjectEnabled,
          classificationLocationEnabled: data.classificationLocationEnabled,
          classificationFaceEnabled: data.classificationFaceEnabled,
          userId: envData.environment.userId,
          libraryId: LibraryId ? LibraryId : envData.environment.libraryId,
        },
      }).catch((e) => {})
      clearLocalData()
    }
    action(data)
    if (nextStep) {
      history.push(nextStep)
    }
  }

  const onPrevious = () => {
    if (previousStep) {
      history.push(previousStep)
    }
  }

  return (
    <div className="formContainer">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex direction="column" justify="space-between">
          <div>{children}</div>

          <Flex justify="space-between" className="buttonBar">
            {previousStep ? (
              <Button
                leftIcon="arrow-back"
                variantColor="teal"
                variant="outline"
                onClick={onPrevious}
                isLoading={formState.isSubmitting}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="submit"
              rightIcon="arrow-forward"
              variantColor="teal"
              variant="solid"
              isLoading={formState.isSubmitting}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      </form>
    </div>
  )
}

export default ModalForm
