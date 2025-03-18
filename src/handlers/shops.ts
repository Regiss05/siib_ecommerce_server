import { Router } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";

const router = Router();
const upload = multer({ dest: "uploads/" });

export default function mountShopEndpoints(router: Router) {
  
  router.post("/add", upload.fields([{ name: "shopLogo" }, { name: "document1" }, { name: "document2" }, { name: "document3" }]), async (req, res) => {
    const { fullName, email, country, shopName, city, phoneNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!fullName || !email || !country || !shopName || !city || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const shopCollection = req.app.locals.shopCollection;

    const newShop = {
      fullName,
      email,
      country,
      shopName,
      city,
      phoneNumber,
      shopLogo: files.shopLogo?.[0]?.path || null,
      documents: [
        files.document1?.[0]?.path || null,
        files.document2?.[0]?.path || null,
        files.document3?.[0]?.path || null,
      ].filter(Boolean),
      createdAt: new Date(),
    };

    const result = await shopCollection.insertOne(newShop);
    res.status(201).json({ message: "Shop created successfully", shop: newShop });
  });

  router.get("/", async (req, res) => {
    const shopCollection = req.app.locals.shopCollection;

    try {
      const shops = await shopCollection.find().toArray();
      res.status(200).json({ shops });
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const shopCollection = req.app.locals.shopCollection;

    try {
      const shop = await shopCollection.findOne({ _id: new ObjectId(id) });
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      res.status(200).json({ shop });
    } catch (error) {
      console.error("Error fetching shop details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const shopCollection = req.app.locals.shopCollection;

    try {
      const result = await shopCollection.updateOne({ _id: new ObjectId(id) }, { $set: updates });

      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Shop not found or no changes made" });
      }

      res.status(200).json({ message: "Shop updated successfully" });
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const shopCollection = req.app.locals.shopCollection;

    try {
      const result = await shopCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.status(200).json({ message: "Shop deleted successfully" });
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
}
