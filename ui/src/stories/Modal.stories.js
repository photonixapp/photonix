import React from 'react'

import Modal from '../components/Modal'

export default {
  title: 'Photonix/Misc/Modal',
  component: Modal,
  argTypes: { onStarClick: { action: 'onStarClick' } },
}

const Template = (args) => <Modal {...args} />

export const DefaultModal = Template.bind({})
DefaultModal.args = {
  children: (
    <>
      <h1>Welcome to Photonix</h1>
      <div className="message">
        <p>
          Thank you for running Photonix. We’ll have you up and running very
          shortly.
        </p>
        <p>
          Firstly we need to create your user account so that access is secure.
          As this is the first account on the system it will have extra admin
          permissions for doing things like creating libraries on the local file
          system and adding additional users.
        </p>
        <p>
          You should generate a secure password and keep it stored somewhere
          safe as there is no way to recover it if you forget it.
        </p>
      </div>
    </>
  ),
}

export const AccentedModal = Template.bind({})
AccentedModal.args = {
  ...DefaultModal.args,
  topAccent: true,
}
