import React from 'react'
import { Flex, Button } from '@chakra-ui/core'

const ModalForm = ({
  children,
  formState,
  onSubmit,
  hasPrevious,
  onPrevious,
}) => {
  return (
    <Flex direction="column" justify="space-between">
      <div className="formContainer">
        <form onSubmit={onSubmit}>
          {children}

          <Flex justify="space-between" className="buttonBar">
            {hasPrevious ? (
              <Button
                leftIcon="arrow-back"
                variantColor="cyan"
                variant="outline"
                onClick={() => onPrevious}
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
              variantColor="cyan"
              variant="solid"
              onClick={() => onSubmit}
              isLoading={formState.isSubmitting}
            >
              Next
            </Button>
          </Flex>
        </form>
      </div>
    </Flex>
  )
}

export default ModalForm
