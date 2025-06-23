import { Express } from "express";

export interface CreateShopRequest {
  fullName: string;
  email: string;
  country: string;
  phoneNumber: string;
  shopName: string;
  city: string;
}

export interface ShopFiles {
  shopLogo: Express.Multer.File[];
  [key: string]: Express.Multer.File[];
}

export function isShopFiles(files: any): files is ShopFiles {
  return (
    files &&
    Array.isArray(files.shopLogo) &&
    Array.isArray(files.tinNumber) &&
    Array.isArray(files.brelaBusinessRegistration) &&
    Array.isArray(files.businessLicenseNumber)
  );
}