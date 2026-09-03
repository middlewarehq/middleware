import { ClustoxRole } from '@/auth/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: ClustoxRole;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: ClustoxRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: ClustoxRole;
  }
}
