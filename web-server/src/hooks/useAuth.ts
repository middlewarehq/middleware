import { useContext } from 'react';
import { AuthContext } from 'src/contexts/ThirdPartyAuthContext';

export const useAuth = () => useContext(AuthContext);
