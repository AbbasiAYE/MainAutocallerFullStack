export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
}

export interface CreateLeadRequest {
  name: string;
  phone: string;
  email: string;
  status?: Lead['status'];
}