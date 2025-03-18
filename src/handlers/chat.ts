// @ts-nocheck

import { Router } from "express";
import { ObjectId } from "mongodb";

export default function mountChatEndpoints(router) {
  router.post("/messages", async (req, res) => {
    const { senderId, text } = req.body;

    if (!senderId || !text) {
      return res.status(400).json({ message: "Sender ID and text are required" });
    }

    const app = req.app;
    const messageCollection = app.locals.messageCollection;

    try {
      const newMessage = {
        senderId: new ObjectId(senderId),
        text,
        timestamp: new Date(),
      };

      const result = await messageCollection.insertOne(newMessage);

      const io = req.app.locals.io;
      io.emit("newMessage", { ...newMessage, _id: result.insertedId.toString() });

      res.status(201).json({ message: "Message sent successfully", messageId: result.insertedId });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.get("/messages", async (req, res) => {
    const app = req.app;
    const messageCollection = app.locals.messageCollection;

    try {
      const messages = await messageCollection.find({}).sort({ timestamp: 1 }).toArray();
      res.status(200).json({ messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
}
