import React, { useState, useEffect } from 'react'
import history from '../history'
import {
  Switch,
  Flex,
  Stack,
  Heading,
  FormLabel,
  Input,
  InputGroup,
  IconButton,
  InputRightElement,
  Button,
  ButtonGroup,
  FormControl,
  Select,
} from '@chakra-ui/core'

import '../static/css/Onboarding.css'

function PasswordInput(tabIndex) {
  const [show, setShow] = React.useState(false)
  const handleClick = () => setShow(!show)

  return (
    <InputGroup size="md">
      <Input
        type={show ? 'text' : 'password'}
        placeholder="Enter password"
        tabindex={tabIndex}
      />
      <InputRightElement width="2.75rem">
        <IconButton
          icon={show ? 'view-off' : 'view'}
          aria-label="Show password"
          h="1.75rem"
          size="sm"
          onClick={handleClick}
          color="brand.700"
        />
      </InputRightElement>
    </InputGroup>
  )
}

export default function Onboarding() {
  const [stepIndex, setStep] = useState(0)

  const steps = [
    {
      title: 'Welcome to Photonix',
      message: [
        "It looks like you've just freshly installed as there are no users configured yet.",
        "It'll just take a minute to create an admin account. This can be the same account that you will use day-to-day but also has priviledges like creating libraries on the local file system and creating additional user accounts.",
        'You should generate a secure password and keep it stored somewhere safe as there is no way to recover it if you forget it.',
      ],
      fields: [
        {
          key: 'username',
          label: 'Username',
          type: 'text',
          required: true,
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          required: true,
        },
        {
          key: 'password2',
          label: 'Password (again)',
          type: 'password',
          required: true,
        },
      ],
    },
    {
      title: 'Admin user created',
      message: [
        "Great, you are the admin of this installation and no one else can create an account (from this web interface anyway). You're also logged in now so we can finish off the installation and get some photos in here.",
      ],
      fields: [],
    },
    {
      title: 'Create a library',
      message: [
        "For Photonix to be of any use to you, you need a Library to store your photos in. You'll be able to share this library with others later on, be they family members or colleagues.",
        'A key thing that defines a library is where all those lovely photos are going to be stored.',
        'You may only ever need to create one library if you are going to be the sole user of the system or you and the other users will all share the same space. However, if you want a personal library and one that you collaborate with other people on, you can add a second library later.',
        'So, go on, create your first library.',
      ],
      fields: [
        {
          key: 'libraryName',
          label: 'Library name',
          type: 'text',
          required: true,
        },
        {
          key: 'storageBackend',
          label: 'Storage backend',
          type: 'select',
          options: [
            {
              value: 'Lo',
              label: 'Local',
            },
            {
              value: 'S3',
              label: 'S3-compatible',
            },
          ],
          required: true,
        },
      ],
    },
  ]

  let step = steps[stepIndex]

  return (
    <div className="Onboarding">
      <h2>{step.title}</h2>
      <div className="message">
        {step.message.map((item, index) => (
          <p>{item}</p>
        ))}
      </div>

      <Stack spacing={4}>
        {step.fields.map((item, index) => {
          let field = null

          if (item.type === 'text') {
            field = (
              <InputGroup size="md">
                <Input />
              </InputGroup>
            )
          } else if (item.type === 'password') {
            field = <PasswordInput tabIndex={index} />
          } else if (item.type === 'select') {
            field = (
              <Select placeholder="Select option">
                {item.options.map((optionItem, optionIndex) => (
                  <option value={optionItem.value}>{optionItem.label}</option>
                ))}
              </Select>
            )
          } else if (item.type === 'boolean') {
            field = <Switch id={item.key} />
          }

          return (
            <FormControl isRequired={item.required}>
              <Flex justify="space-between" key={item.key + item.type}>
                <FormLabel htmlFor={item.key}>{item.label}:</FormLabel>
                {field}
              </Flex>
            </FormControl>
          )
        })}

        <Flex justify="space-between">
          {stepIndex > 0 ? (
            <Button
              leftIcon="arrow-back"
              variantColor="cyan"
              variant="outline"
              onClick={() => setStep(stepIndex - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button
            rightIcon="arrow-forward"
            variantColor="cyan"
            variant="solid"
            onClick={() => setStep(stepIndex + 1)}
          >
            Next
          </Button>
        </Flex>
      </Stack>
    </div>
  )
}
