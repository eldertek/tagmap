interface User {
  id: number;
  username: string;
  user_type: 'admin' | 'salarie' | 'client';
  must_change_password?: boolean;
  salarie?: number;
  salarie_name?: string;
}
interface InitialState {
  path: string;
  isAuthenticated: boolean;
  user: User | null;
}
declare global {
  interface Window {
    INITIAL_STATE: InitialState;
  }
}
export {}; 