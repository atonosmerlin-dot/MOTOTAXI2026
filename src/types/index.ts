export enum UserRole {
  CLIENT = 'CLIENT',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export interface FixedPoint {
  id: string;
  name: string;
  address: string;
}

export interface Driver {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  status: 'IDLE' | 'BUSY';
  currentPointId?: string;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface RideRequest {
  id: string;
  pointId: string;
  pointName: string;
  clientId: string;
  driverId?: string;
  status: RequestStatus;
  timestamp: number;
}

export interface AppState {
  points: FixedPoint[];
  drivers: Driver[];
  requests: RideRequest[];
  currentUser: {
    role: UserRole;
    id: string;
    name?: string;
  } | null;
}
