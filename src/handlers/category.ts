import express from "express";
import { Category } from "../types/category";

const router = express.Router();

// Add default categories if they don't exist
const defaultCategories = ["Houses", "Cars", "Clothes", "Electronics"];

router.get("/", async (req, res) => {
  try {
    let categories = await Category.find();
    if (categories.length === 0) {
      categories = await Category.insertMany(defaultCategories.map(name => ({ name })));
    }
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: "Error fetching categories" });
  }
});

export default router;
