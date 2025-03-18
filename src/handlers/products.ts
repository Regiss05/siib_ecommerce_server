import { Router } from "express";
import multer from "multer";
import path from "path";
import { ObjectId } from "mongodb"; // ✅ Import ObjectId

const router = Router();
const upload = multer({ dest: "uploads/" });

export default function mountProductEndpoints(router: Router) {
  
  router.post("/add", upload.single("image"), async (req, res) => {
    const { name, description, category, price, availableStock, shopId } = req.body;
    const image = req.file;

    if (!name || !description || !category || !price || !availableStock || !image || !shopId) {
      return res.status(400).json({ message: "All fields are required, including shopId" });
    }

    const app = req.app;
    const productCollection = app.locals.productCollection;
    const shopCollection = app.locals.shopCollection;

    try {
      const shop = await shopCollection.findOne({ _id: new ObjectId(shopId) });

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const newProduct = {
        name,
        description,
        category,
        price: parseFloat(price),
        availableStock: parseInt(availableStock),
        imageUrl: `/uploads/${image.filename}`,
        shopId: new ObjectId(shopId), 
        createdAt: new Date(),
      };

      await productCollection.insertOne(newProduct);
      res.status(201).json({ message: "Product added successfully", product: newProduct });

    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.get("/", async (req, res) => {
    const { page = 1, limit = 10, shopId } = req.query;
    const app = req.app;
    const productCollection = app.locals.productCollection;

    try {
      // @ts-ignore
      const query = shopId ? { shopId: new ObjectId(shopId) } : {};

      const products = await productCollection
        .find(query)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      res.status(200).json({ products });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const app = req.app;
    const productCollection = app.locals.productCollection;
    const shopCollection = app.locals.shopCollection;

    try {
      const product = await productCollection.findOne({ _id: new ObjectId(id) });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Fetch shop details
      const shop = await shopCollection.findOne({ _id: product.shopId });

      res.status(200).json({ product, shop });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.post("/:id/like", async (req, res) => {
    const { id } = req.params;
    const app = req.app;
    const productCollection = app.locals.productCollection;
  
    try {
      const product = await productCollection.findOne({ _id: new ObjectId(id) });
  
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      const currentLikes = product.likes || 0; // Default to 0 if undefined
      const newLikes = currentLikes > 0 ? 0 : 1; // Toggle like/dislike

      await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { likes: newLikes } }
      );
  
      // Respond with updated like status
      res.status(200).json({ message: newLikes === 1 ? "Liked" : "Disliked", likes: newLikes });
  
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
}

