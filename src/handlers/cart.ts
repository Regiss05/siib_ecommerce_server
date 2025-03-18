// @ts-nocheck

import { Router } from "express";
import { ObjectId } from "mongodb";

const router = Router();

export default function mountCartEndpoints(router: Router) {

  router.post("/add", async (req, res) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cartCollection = req.app.locals.cartCollection;
    const productCollection = req.app.locals.productCollection;

    try {
      const product = await productCollection.findOne({ _id: new ObjectId(productId) });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (!product.shopId) {
        return res.status(400).json({ message: "Product is missing shopId" });
      }

      const cartItem = await cartCollection.findOne({ userId, productId });

      if (cartItem) {
        await cartCollection.updateOne({ _id: cartItem._id }, { $inc: { quantity } });
      } else {
        await cartCollection.insertOne({
          userId,
          productId,
          shopId: product.shopId,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity,
        });
      }

      res.status(200).json({ message: "Item added to cart" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    const cartCollection = req.app.locals.cartCollection;
    const productCollection = req.app.locals.productCollection;

    try {
      const cartItems = await cartCollection.find({ userId }).toArray();
      const productIds = cartItems.map((item) => new ObjectId(item.productId));

      const products = await productCollection.find({ _id: { $in: productIds } }).toArray();

      const cartWithProducts = cartItems.map((item) => ({
        ...item,
        product: products.find((p) => p._id.equals(item.productId)),
      }));

      res.status(200).json({ cart: cartWithProducts });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.delete("/:userId/:productId", async (req, res) => {
    const { userId, productId } = req.params;
    const cartCollection = req.app.locals.cartCollection;

    try {
      const result = await cartCollection.deleteOne({ userId, productId });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      res.status(200).json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing item from cart:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.patch("/update", async (req, res) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cartCollection = req.app.locals.cartCollection;
    const productCollection = req.app.locals.productCollection;

    try {
      const product = await productCollection.findOne({ _id: new ObjectId(productId) });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (quantity > product.availableStock) {
        return res.status(400).json({ message: "Not enough stock available" });
      }

      const result = await cartCollection.updateOne({ userId, productId }, { $set: { quantity } });

      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      res.status(200).json({ message: "Cart updated successfully" });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.post("/checkout", async (req, res) => {
    const { userId } = req.body;
    const cartCollection = req.app.locals.cartCollection;
    const orderCollection = req.app.locals.orderCollection;
    const productCollection = req.app.locals.productCollection;

    try {
      const cartItems = await cartCollection.find({ userId }).toArray();
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      let totalAmount = 0;
      for (const item of cartItems) {
        const product = await productCollection.findOne({ _id: new ObjectId(item.productId) });

        if (!product || product.availableStock < item.quantity) {
          return res.status(400).json({ message: "One or more items are out of stock" });
        }

        totalAmount += product.price * item.quantity;
      }

      const newOrder = {
        userId,
        items: cartItems,
        totalAmount,
        status: "pending_payment",
        createdAt: new Date(),
      };

      const order = await orderCollection.insertOne(newOrder);

      await cartCollection.deleteMany({ userId });

      res.status(200).json({ message: "Checkout successful", orderId: order.insertedId });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  router.post("/confirm-payment", async (req, res) => {
    const { orderId, paymentStatus } = req.body;
    const orderCollection = req.app.locals.orderCollection;
    const productCollection = req.app.locals.productCollection;
    const cartCollection = req.app.locals.cartCollection;

    try {
      const order = await orderCollection.findOne({ _id: new ObjectId(orderId) });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (paymentStatus !== "paid") {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      for (const item of order.items) {
        await productCollection.updateOne(
          { _id: new ObjectId(item.productId) },
          { $inc: { availableStock: -item.quantity } }
        );
      }

      await orderCollection.updateOne({ _id: new ObjectId(orderId) }, { $set: { status: "paid" } });

      await cartCollection.deleteMany({ userId: order.userId });

      res.status(200).json({ message: "Payment confirmed, order completed" });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

}
