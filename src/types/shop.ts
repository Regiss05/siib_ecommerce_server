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
  if (typeof files !== "object" || files === null) return false;

  // Check shopLogo is either undefined or an array
  const validShopLogo = files.shopLogo === undefined || Array.isArray(files.shopLogo);
  // Check if any document field is either undefined or an array
  const validDocuments =
    files.document1 === undefined || Array.isArray(files.document1);
  const validDocuments2 =
    files.document2 === undefined || Array.isArray(files.document2);
  const validDocuments3 =
    files.document3 === undefined || Array.isArray(files.document3);

  return validShopLogo && validDocuments && validDocuments2 && validDocuments3;
}
