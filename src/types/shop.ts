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
  shopLogo?: Express.Multer.File[];
  document1?: Express.Multer.File[];
  document2?: Express.Multer.File[];
  document3?: Express.Multer.File[];
  [key: string]: Express.Multer.File[] | undefined;
}

export function isShopFiles(files: any): files is ShopFiles {
  return (
    typeof files === "object" &&
    Array.isArray(files.shopLogo) &&
    (Array.isArray(files.document1) ||
      Array.isArray(files.document2) ||
      Array.isArray(files.document3))
  );
}
