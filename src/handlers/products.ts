import { Router } from "express";
import multer from "multer";
import path from "path";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/home/administrator/siib/eserver-app/uploads");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

export default function mountProductEndpoints(router: Router) {
  // Create product with image upload
  router.post("/add", upload.single("image"), async (req, res): Promise<void> => {
    const { name, description, category, price, availableStock, shopId } = req.body;
    const image = req.file;

    if (!name || !description || !category || !price || !availableStock || !image || !shopId) {
      res.status(400).json({ message: "All fields are required, including shopId" });
      return;
    }

    const app = req.app;
    const productCollection = app.locals.productCollection;
    const shopCollection = app.locals.shopCollection;

    try {
      const shop = await shopCollection.findOne({ _id: new ObjectId(shopId) });
      if (!shop) {
        res.status(404).json({ message: "Shop not found" });
        return;
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

  // Get all products with optional shop/country filtering
  router.get("/", async (req, res): Promise<void> => {
    const { page = 1, limit = 1000, shopId, country } = req.query;
    const app = req.app;
    const productCollection = app.locals.productCollection;

    try {
      const matchStage: any = {};
      if (shopId) matchStage.shopId = new ObjectId(shopId as string);

      const pipeline = [
        {
          $lookup: {
            from: "shops",
            localField: "shopId",
            foreignField: "_id",
            as: "shop",
          },
        },
        { $unwind: "$shop" },
        ...(country ? [{ $match: { "shop.country": country } }] : []),
        { $match: matchStage },
        {
          $project: {
            name: 1,
            description: 1,
            category: 1,
            price: 1,
            availableStock: 1,
            imageUrl: 1,
            createdAt: 1,
            likes: 1,
            likedBy: 1,
            shop: {
              _id: "$shop._id",
              shopName: "$shop.shopName",
              fullName: "$shop.fullName",
              email: "$shop.email",
              phoneNumber: "$shop.phoneNumber",
              country: "$shop.country",
              city: "$shop.city",
              shopLogo: "$shop.shopLogo",
              documents: "$shop.documents",
              createdAt: "$shop.createdAt",
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      ];

      const products = await productCollection.aggregate(pipeline).toArray();
      res.status(200).json({ products });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get search suggestions
  router.get("/search/suggestions", async (req, res): Promise<void> => {
    const { query } = req.query;
    const app = req.app;
    const productCollection = app.locals.productCollection;

    if (!query || typeof query !== "string") {
      res.status(400).json({ message: "Query parameter is required" });
      return;
    }

    try {
      const suggestions = await productCollection
        .find({ name: { $regex: query, $options: "i" } })
        .project({ name: 1 })
        .limit(10)
        .toArray();

      res.status(200).json({ suggestions: suggestions.map(s => s.name) });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get product by ID
  router.get("/:id", async (req, res): Promise<void> => {
    const { id } = req.params;
    const app = req.app;
    const productCollection = app.locals.productCollection;
    const shopCollection = app.locals.shopCollection;

    try {
      const product = await productCollection.findOne({ _id: new ObjectId(id) });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      const shop = await shopCollection.findOne({ _id: product.shopId });
      if (shop) {
        product.shop = {
          _id: shop._id,
          shopName: shop.shopName,
          fullName: shop.fullName,
          email: shop.email,
          phoneNumber: shop.phoneNumber,
          country: shop.country,
          city: shop.city,
          shopLogo: shop.shopLogo,
          documents: shop.documents,
          createdAt: shop.createdAt,
        };
      }

      res.status(200).json({ product });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Like or unlike product
  router.post("/:id/like", async (req, res): Promise<void> => {
    const { id } = req.params;
    const app = req.app;
    const productCollection = app.locals.productCollection;
    const currentUser = req.session.currentUser;

    if (!currentUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = currentUser.uid;

    try {
      const product = await productCollection.findOne({ _id: new ObjectId(id) });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      const likedBy = product.likedBy || [];
      const alreadyLiked = likedBy.includes(userId);

      const updatedLikedBy = alreadyLiked
        ? likedBy.filter(uid => uid !== userId)
        : [...likedBy, userId];

      await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { likedBy: updatedLikedBy } }
      );

      res.status(200).json({
        message: alreadyLiked ? "Disliked" : "Liked",
        likedBy: updatedLikedBy,
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get products liked by user (session-based)
  router.get("/liked/by-user", async (req, res): Promise<void> => {
    const app = req.app;
    const productCollection = app.locals.productCollection;
    const currentUser = req.session.currentUser;

    if (!currentUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const likedProducts = await productCollection
        .find({ likedBy: currentUser.uid })
        .toArray();

      res.status(200).json({ products: likedProducts });
    } catch (error) {
      console.error("Error fetching liked products:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get products liked by userId (optional endpoint)
  router.get("/favorites/:userId", async (req, res): Promise<void> => {
    const { userId } = req.params;
    const app = req.app;
    const productCollection = app.locals.productCollection;

    try {
      const likedProducts = await productCollection
        .find({ likedBy: userId })
        .toArray();

      res.status(200).json({ products: likedProducts });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
}
