import React from 'react'
import {
  Switch,
  Flex,
  Input,
  InputGroup,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Select,
} from '@chakra-ui/core'

import PasswordInput from './fields/PasswordInput'

const ModalField = ({
  register,
  error,
  type,
  name,
  label,
  placeholder,
  required,
  minLength,
  maxLength,
  selectOptions,
  ...rest
}) => {
  let field = null

  let registerOptions = {}
  if (required) {
    registerOptions.required = required
  }
  if (minLength) {
    registerOptions.minLength = minLength
  }
  if (maxLength) {
    registerOptions.maxLength = maxLength
  }

  let errorMessage = null
  if (error) {
    if (error.type == 'required') {
      errorMessage = <FormErrorMessage>{label} is required</FormErrorMessage>
    } else if (error.type == 'minLength') {
      errorMessage = (
        <FormErrorMessage>{label} has a minimum length</FormErrorMessage>
      )
    } else if (error.message) {
      errorMessage = <FormErrorMessage>{error.message}</FormErrorMessage>
    }
  }

  if (type === 'text') {
    field = (
      <>
        <InputGroup size="md">
          <Input name={name} ref={register(registerOptions)} />
        </InputGroup>
        {errorMessage}
      </>
    )
  } else if (type === 'password') {
    field = (
      <>
        <PasswordInput
          name={name}
          register={register}
          registerOptions={registerOptions}
        />
        {errorMessage}
      </>
    )
  } else if (type === 'select') {
    field = (
      <Select placeholder="Select option">
        {selectOptions.map((optionItem, optionIndex) => (
          <option value={optionItem.value}>{optionItem.label}</option>
        ))}
      </Select>
    )
  } else if (type === 'boolean') {
    field = <Switch id={name} />
  }

  return (
    <FormControl isInvalid={error && true} isRequired={false} {...rest}>
      <Flex justify="space-between" key={name + type}>
        <FormLabel htmlFor={name}>{label}:</FormLabel>
        <div className="field">{field}</div>
      </Flex>
    </FormControl>
  )
}

export default ModalField
