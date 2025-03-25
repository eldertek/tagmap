export interface UserDetails {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role: 'ADMIN' | 'ENTREPRISE' | 'SALARIE' | 'VISITEUR';
  parent_id?: number; // ID de l'entreprise ou du salarié parent
  parent_name?: string;
  is_active?: boolean;
  storage_quota?: number; // Quota de stockage en Mo
  storage_used?: number; // Stockage utilisé en Mo
}

export interface Enterprise extends UserDetails {
  role: 'ENTREPRISE';
  employees?: number[]; // IDs des salariés
  visitors?: number[]; // IDs des visiteurs
}

export interface Employee extends UserDetails {
  role: 'SALARIE';
  enterprise_id: number;
  managed_visitors?: number[]; // IDs des visiteurs gérés par ce salarié
}

export interface Visitor extends UserDetails {
  role: 'VISITEUR';
  enterprise_id: number;
  employee_id?: number; // ID du salarié qui gère ce visiteur
}