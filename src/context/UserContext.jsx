import { createContext, useContext } from 'react'
import { useAuth } from './AuthContext'

export const ROLE_TABS = {
  techlead: ['dashboard', 'manage', 'audit'],
  partlead: [],
  member:   [],
  devops:   ['dashboard', 'security'],
}

// MOCK_USERS kept for TopBar demo role-switcher compatibility
export const MOCK_USERS = {
  techlead: { id: 'u1', name: '김테크',  role: 'techlead', roleLabel: '테크 리드', team: null },
  partlead: { id: 'u2', name: '이파트',  role: 'partlead', roleLabel: '파트장',    team: '프론트엔드팀' },
  member:   { id: 'u3', name: '박팀원',  role: 'member',   roleLabel: '팀원',      team: '프론트엔드팀', memberName: '박팀원' },
  devops:   { id: 'u4', name: '장데브',  role: 'devops',   roleLabel: 'DevOps',    team: null },
}

const ROLE_LABEL = {
  techlead: '테크 리드',
  partlead: '파트장',
  member:   '팀원',
  devops:   'DevOps',
}

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const { user: authUser, isAuthenticated } = useAuth()

  // Build a user object compatible with existing page components.
  // If authenticated, use real user data; otherwise fall back to techlead mock
  // so the UI still renders during development without a backend.
  let user
  if (isAuthenticated && authUser) {
    user = {
      id:         authUser.id,
      name:       authUser.email.split('@')[0],
      role:       authUser.role,
      roleLabel:  ROLE_LABEL[authUser.role] ?? authUser.role,
      team:       null,       // team name not in JWT; pages that need it will fetch
      team_id:    authUser.team_id,
      email:      authUser.email,
      memberName: authUser.email.split('@')[0],
    }
  } else {
    user = MOCK_USERS.techlead
  }

  // switchRole is kept so TopBar doesn't break; it's a no-op in real-auth mode
  const switchRole = () => {}

  return (
    <UserContext.Provider value={{ user, switchRole }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
