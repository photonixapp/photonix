import React, { useState } from 'react'
import {
  IconButton,
  Input,
  InputRightElement,
  InputGroup,
} from '@chakra-ui/core'

const PasswordInput = ({ name, register, registerOptions, ...rest }) => {
  const [show, setShow] = useState(false)
  const handleClick = () => setShow(!show)

  return (
    <InputGroup size="md">
      <Input
        name={name}
        type={show ? 'text' : 'password'}
        ref={register(registerOptions)}
        {...rest}
      />
      <InputRightElement width="2.75rem">
        <IconButton
          icon={show ? 'view-off' : 'view'}
          aria-label="Show password"
          h="1.75rem"
          size="sm"
          onClick={handleClick}
          color="gray.100"
        />
      </InputRightElement>
    </InputGroup>
  )
}

export default PasswordInput
