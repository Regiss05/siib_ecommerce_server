import { ObjectId } from "mongodb";

export interface CartItem {
  _id?: ObjectId;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
}
