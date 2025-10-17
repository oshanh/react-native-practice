export interface Debtor {
  id: number;
  name: string;
  phoneNumbers: string[]; // Changed to array to support multiple phone numbers
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}
