export type Role = 'owner' | 'admin' | 'member'

export interface Org {
  id: string
  name: string
}

export interface User {
  id: string
  orgId: string
  orgName: string
  name: string
  email: string
  role: Role
}
