import React from 'react'
import { ErrorMessage } from 'react-hook-form'
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
  errors,
  type,
  name,
  label,
  placeholder,
  required,
  minLength,
  maxLength,
  selectOptions,
  defaultValue,
  validate,
  ...rest
}) => {
  let field = null

  let registerOptions = {}
  if (required) {
    registerOptions.required = `${label} is required`
  }
  if (minLength) {
    registerOptions.minLength = {
      value: minLength,
      message: `${label} must be at least ${minLength} characters long`,
    }
  }
  if (maxLength) {
    registerOptions.minLength = {
      value: minLength,
      message: `${label} must be no more than ${minLength} characters long`,
    }
  }
  if (validate) {
    registerOptions.validate = validate
  }

  let errorMessage = (
    <FormErrorMessage className="error">
      <ErrorMessage errors={errors} name={name} />
    </FormErrorMessage>
  )

  if (type === 'text') {
    field = (
      <>
        <InputGroup size="md">
          <Input
            name={name}
            ref={register(registerOptions)}
            defaultValue={defaultValue}
            focusBorderColor="teal.500"
          />
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
          defaultValue={defaultValue}
          focusBorderColor="teal.500"
        />
        {errorMessage}
      </>
    )
  } else if (type === 'select') {
    field = (
      <>
        <Select
          name={name}
          ref={register(registerOptions)}
          placeholder="Select option"
          defaultValue={defaultValue}
          focusBorderColor="teal.500"
        >
          {selectOptions.map((optionItem, optionIndex) => (
            <option value={optionItem.value}>{optionItem.label}</option>
          ))}
        </Select>
        {errorMessage}
      </>
    )
  } else if (type === 'boolean') {
    field = (
      <>
        <Switch
          name={name}
          ref={register(registerOptions)}
          defaultIsChecked={defaultValue}
          color="teal"
        />
        {errorMessage}
      </>
    )
  }

  return (
    <FormControl isInvalid={errors[name] && true} isRequired={false} {...rest}>
      <Flex justify="space-between" key={name + type}>
        <FormLabel htmlFor={name} className={`label label-${type}`}>
          {label}:
        </FormLabel>
        <div className={`field field-${type}`}>{field}</div>
      </Flex>
    </FormControl>
  )
}

export default ModalField
