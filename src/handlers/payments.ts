import axios from "axios";
import { Router, Request, Response, NextFunction } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

export default function mountPaymentsEndpoints(router: Router) {
  // Handle the incomplete payment
  const handleIncomplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = req.body.payment;
      const paymentId = payment.identifier;
      const txid = payment.transaction?.txid;
      const txURL = payment.transaction?._link;

      const orderCollection = req.app.locals.orderCollection;
      const order = await orderCollection.findOne({ pi_payment_id: paymentId });

      if (!order) {
        res.status(400).json({ message: "Order not found" });
        return;
      }

      const horizonResponse = await axios.get(txURL, { timeout: 20000 });
      const paymentIdOnBlock = horizonResponse.data.memo;

      if (paymentIdOnBlock !== order.pi_payment_id) {
        res.status(400).json({ message: "Payment id doesn't match." });
        return;
      }

      await orderCollection.updateOne(
        { pi_payment_id: paymentId },
        { $set: { txid, paid: true } }
      );

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      res.status(200).json({ message: `Handled the incomplete payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  };

  // Approve the current payment
  const handleApprove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.currentUser) {
        res.status(401).json({ error: "unauthorized", message: "User needs to sign in first" });
        return;
      }

      const paymentId = req.body.paymentId;
      const currentPayment = await platformAPIClient.get(`/v2/payments/${paymentId}`);
      const orderCollection = req.app.locals.orderCollection;

      await orderCollection.insertOne({
        pi_payment_id: paymentId,
        product_id: currentPayment.data.metadata.productId,
        user: req.session.currentUser.uid,
        txid: null,
        paid: false,
        cancelled: false,
        created_at: new Date()
      });

      await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);

      res.status(200).json({ message: `Approved the payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  };

  // Complete the current payment
  const handleComplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentId = req.body.paymentId;
      const txid = req.body.txid;
      const orderCollection = req.app.locals.orderCollection;

      await orderCollection.updateOne(
        { pi_payment_id: paymentId },
        { $set: { txid, paid: true } }
      );

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      res.status(200).json({ message: `Completed the payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  };

  // Handle the cancelled payment
  const handleCancelled = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentId = req.body.paymentId;
      const orderCollection = req.app.locals.orderCollection;

      await orderCollection.updateOne(
        { pi_payment_id: paymentId },
        { $set: { cancelled: true } }
      );

      res.status(200).json({ message: `Cancelled the payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  };

  router.post("/incomplete", handleIncomplete);
  router.post("/approve", handleApprove);
  router.post("/complete", handleComplete);
  router.post("/cancelled_payment", handleCancelled);
}
