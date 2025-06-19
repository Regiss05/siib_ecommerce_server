import axios from "axios";
import { Router } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

export default function mountPaymentsEndpoints(router: Router) {
  // handle the incomplete payment
  router.post('/incomplete', async (req, res, next) => {
    try {
      const payment = req.body.payment;
      const paymentId = payment.identifier;
      const txid = payment.transaction?.txid;
      const txURL = payment.transaction?._link;

      const orderCollection = req.app.locals.orderCollection;
      const order = await orderCollection.findOne({ pi_payment_id: paymentId });

      if (!order) {
        return res.status(400).json({ message: "Order not found" });
      }

      const horizonResponse = await axios.create({ timeout: 20000 }).get(txURL);
      const paymentIdOnBlock = horizonResponse.data.memo;

      if (paymentIdOnBlock !== order.pi_payment_id) {
        return res.status(400).json({ message: "Payment id doesn't match." });
      }

      await orderCollection.updateOne({ pi_payment_id: paymentId }, { $set: { txid, paid: true } });

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      return res.status(200).json({ message: `Handled the incomplete payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  });

  // approve the current payment
  router.post('/approve', async (req, res, next) => {
    try {
      if (!req.session.currentUser) {
        return res.status(401).json({ error: 'unauthorized', message: "User needs to sign in first" });
      }

      const app = req.app;
      const paymentId = req.body.paymentId;
      const currentPayment = await platformAPIClient.get(`/v2/payments/${paymentId}`);
      const orderCollection = app.locals.orderCollection;

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

      return res.status(200).json({ message: `Approved the payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  });

  // complete the current payment
  router.post('/complete', async (req, res, next) => {
    try {
      const app = req.app;
      const paymentId = req.body.paymentId;
      const txid = req.body.txid;
      const orderCollection = app.locals.orderCollection;

      await orderCollection.updateOne({ pi_payment_id: paymentId }, { $set: { txid, paid: true } });

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      return res.status(200).json({ message: `Completed the payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  });

  // handle the cancelled payment
  router.post('/cancelled_payment', async (req, res, next) => {
    try {
      const app = req.app;
      const paymentId = req.body.paymentId;
      const orderCollection = app.locals.orderCollection;

      await orderCollection.updateOne({ pi_payment_id: paymentId }, { $set: { cancelled: true } });

      return res.status(200).json({ message: `Cancelled the payment ${paymentId}` });
    } catch (err) {
      next(err);
    }
  });
}
