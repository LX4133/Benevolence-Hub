export type DonationRecord = {
  id: string;
  project: string;
  date: string;
  amount: number;
  invoiceStatus: string;
  certificateStatus: string;
  fileName: string;
  fileAvailable: boolean;
  fileToken: string;
};

export type DonorMaterial = {
  id: string;
  type: string;
  name: string;
  relatedRecordId: string;
  status: string;
  fileName: string;
  fileAvailable: boolean;
  fileToken: string;
};

export type DonorData = {
  donorId: string;
  donorName: string;
  records: DonationRecord[];
  materials: DonorMaterial[];
};
