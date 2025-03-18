import { Request, Response, NextFunction } from "express";
import { CreateShopRequest, ShopFiles, isShopFiles } from "../types/shop";

export function validateShopRequest(req: Request, res: Response, next: NextFunction) {
  const body = req.body as Partial<CreateShopRequest>;
  const requiredFields: (keyof CreateShopRequest)[] = [
    "fullName",
    "email",
    "country",
    "phoneNumber",
    "shopName",
    "city",
  ];

  for (const field of requiredFields) {
    if (!body[field]) {
      return res.status(400).json({ message: `Field '${field}' is required` });
    }
  }

  if (!req.files || !isShopFiles(req.files)) {
    return res.status(400).json({ message: "Invalid file upload" });
  }

  next();
}