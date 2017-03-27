import { WebSocketBridge } from 'django-channels'


const webSocketBridge = new WebSocketBridge()
webSocketBridge.connect()


export function getWebsocketBridge(ws) {
  return webSocketBridge
}

export const runCommand = (command) => {
  console.log('runCommand')
  webSocketBridge.send({command: command})
  return {
    type: 'RUN_COMMAND',
    command: command,
  }
}
