import { createContext, useContext, useState } from 'react';

export const MOCK_USERS = {
  techlead: { id: 'u1', name: '김테크',  role: 'techlead', roleLabel: '테크 리드', team: null },
  partlead: { id: 'u2', name: '이파트',  role: 'partlead', roleLabel: '파트장',    team: '프론트엔드팀' },
  member:   { id: 'u3', name: '박팀원',  role: 'member',   roleLabel: '팀원',      team: '프론트엔드팀', memberName: '박팀원' },
  devops:   { id: 'u4', name: '장데브',  role: 'devops',   roleLabel: 'DevOps',    team: null },
};

export const ROLE_TABS = {
  techlead: ['integration', 'quota', 'analytics', 'audit', 'routing', 'provisioning'],
  partlead: ['quota', 'analytics'],
  member:   ['quota', 'analytics'],
  devops:   ['security', 'analytics'],
};

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(MOCK_USERS.techlead);
  const switchRole = (role) => setUser(MOCK_USERS[role]);
  return (
    <UserContext.Provider value={{ user, switchRole }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
