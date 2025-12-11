interface AwinPromotion {
  promotionId?: string | number;
  title?: string;
  description?: string;
  type?: string;
  voucher?: { code?: string };
  advertiser?: { id?: string | number; name?: string };
  urlTracking?: string;
  terms?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface BrandDetails {
  id: string;
  name: string;
  logo?: string;
  status?: string;
  activeDeals?: number;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
  description?: string;
  category?: string;
  programmeId?: string; 
}

interface DealPayload {
  promotionId: string;
  id: string;
  title: string;
  description: string;
  brand: string;
  brandDetails: {
    id: string;
    name: string;
    logo: string;
    status?: string;
    activeDeals?: number;
    createdAt?: FirebaseFirestore.FieldValue;
    updatedAt?: FirebaseFirestore.FieldValue;
    description?: string;
  };
  discount: string;
  category: string;
  code: string;
  label: string;
  link: string;
  terms: string;
  status: string;
  updatedAt: FirebaseFirestore.FieldValue;
  image: string;
  startsAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  source: string;
  rawData: AwinPromotion;
  createdAt?: FirebaseFirestore.FieldValue;
}

export {
  AwinPromotion,
  BrandDetails,
  DealPayload
}