import { Router, Request, Response } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";

// Configure Multer to use external uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/home/administrator/siib/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

export default function mountShopEndpoints(router: Router) {
  router.post(
    "/add",
    upload.fields([
      { name: "shopLogo" },
      { name: "document1" },
      { name: "document2" },
      { name: "document3" },
    ]),
    async (req: Request, res: Response): Promise<void> => {
      const { fullName, email, country, shopName, city, phoneNumber } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!fullName || !email || !country || !shopName || !city || !phoneNumber) {
        res.status(400).json({ message: "All fields are required" });
        return;
      }

      const shopCollection = req.app.locals.shopCollection;

      const shopLogoPath = files.shopLogo?.[0]?.filename
        ? `/uploads/${files.shopLogo[0].filename}`
        : null;

      const documentPaths = [
        files.document1?.[0]?.filename,
        files.document2?.[0]?.filename,
        files.document3?.[0]?.filename,
      ]
        .filter(Boolean)
        .map(filename => `/uploads/${filename}`);

      const newShop = {
        fullName,
        email,
        country,
        shopName,
        city,
        phoneNumber,
        shopLogo: shopLogoPath,
        documents: documentPaths,
        createdAt: new Date(),
      };

      const result = await shopCollection.insertOne(newShop);
      res.status(201).json({ message: "Shop created successfully", shop: newShop });
    }
  );

  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const shopCollection = req.app.locals.shopCollection;

    try {
      const shops = await shopCollection.find().toArray();
      res.status(200).json({ shops });
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const shopCollection = req.app.locals.shopCollection;

    try {
      const shop = await shopCollection.findOne({ _id: new ObjectId(id) });
      if (!shop) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }
      res.status(200).json({ shop });
    } catch (error) {
      console.error("Error fetching shop details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;
    const shopCollection = req.app.locals.shopCollection;

    try {
      const result = await shopCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      if (result.modifiedCount === 0) {
        res.status(404).json({ message: "Shop not found or no changes made" });
        return;
      }

      res.status(200).json({ message: "Shop updated successfully" });
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const shopCollection = req.app.locals.shopCollection;

    try {
      const result = await shopCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }

      res.status(200).json({ message: "Shop deleted successfully" });
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
}
