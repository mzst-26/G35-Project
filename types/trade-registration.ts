export interface TradeRegistrationFormFields { //object structure for the trade registration form fields
  name: string;
  occupation: string;
  address: string;
  references: string;
}

export interface TradeRegistrationPayload extends TradeRegistrationFormFields { //extends the form fields to include file uploads
  qualifications: File | null; //single file
  photos: FileList | null; //multiple files
}

export type TradeRegistrationSubmit = (data: TradeRegistrationPayload) => void; //function for when form is submitted
