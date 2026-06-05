import { RecordType } from './record-type.enum';

export interface RecordEntry {
  id: number;
  name: string;
  type: RecordType;
  createdByUserId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
