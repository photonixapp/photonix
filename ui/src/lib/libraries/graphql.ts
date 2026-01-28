import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type { AllLibrariesResponse } from './types'

export const GET_ALL_LIBRARIES: TypedDocumentNode<
  AllLibrariesResponse,
  Record<string, never>
> = gql`
  query GetAllLibraries {
    allLibraries {
      id
      name
    }
  }
`
