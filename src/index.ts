// @ts-nocheck

import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import logger from 'morgan';
import MongoStore from 'connect-mongo';
import { MongoClient } from 'mongodb';
import http from "http";
import { Server } from "socket.io";
import env from './environments';
import mountPaymentsEndpoints from './handlers/payments';
import mountUserEndpoints from './handlers/users';
import mountProductEndpoints from './handlers/products';
import categoryRoutes from "./handlers/category";
import mountCartEndpoints from "./handlers/cart";
import mountShopEndpoints from "./handlers/shops";
import mountChatEndpoints from "./handlers/chat";

import "./types/session";

const dbName = env.mongo_db_name;
const mongoUri = `mongodb://${env.mongo_host}/${dbName}`;
const mongoClientOptions = {
  authSource: "admin",
  auth: {
    username: env.mongo_user,
    password: env.mongo_password,
  },
};

const app: express.Application = express();

// Logging
app.use(logger('dev'));
app.use(logger('common', {
  stream: fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), { flags: 'a' }),
}));

// JSON body parser
app.use(express.json());

// CORS (Express)
const allowedOrigin = "https://pi.siibarnut.com"; // No trailing slash
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "OPTIONS"],
}));

// Explicitly handle preflight for all routes
app.options('*', cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "OPTIONS"],
}));

// Cookie parser
app.use(cookieParser());

// Sessions
app.use(session({
  secret: env.session_secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    mongoOptions: mongoClientOptions,
    dbName,
    collectionName: 'user_sessions'
  }),
}));

// Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  },
});

app.locals.io = io;

io.on("connection", (socket) => {
  console.log(`🔗 User connected: ${socket.id}, IP: ${socket.handshake.address}`);

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Static file serving
app.use('/uploads', express.static('uploads'));

// API endpoints
const paymentsRouter = express.Router();
mountPaymentsEndpoints(paymentsRouter);
app.use('/payments', paymentsRouter);

const userRouter = express.Router();
mountUserEndpoints(userRouter);
app.use('/user', userRouter);

const productRouter = express.Router();
mountProductEndpoints(productRouter);
app.use('/products', productRouter);

app.use("/categories", categoryRoutes);

const cartRouter = express.Router();
mountCartEndpoints(cartRouter);
app.use("/cart", cartRouter);

app.get("/api/cart/:userId", async (req, res) => {
  // Fetch cart data for a user
});

const shopRouter = express.Router();
mountShopEndpoints(shopRouter);
app.use("/shops", shopRouter);

const chatRouter = express.Router();
mountChatEndpoints(chatRouter);
app.use("/chat", chatRouter);

// Test route
app.get('/', async (_, res) => {
  res.status(200).send({ message: "Hello, World!" });
});

// Start the server
server.listen(8000, async () => {
  try {
    const client = await MongoClient.connect(mongoUri, mongoClientOptions);
    const db = client.db(dbName);
    app.locals.orderCollection = db.collection("orders");
    app.locals.userCollection = db.collection("users");
    app.locals.productCollection = db.collection("products");
    app.locals.cartCollection = db.collection("cart");
    app.locals.shopCollection = db.collection("shops");
    app.locals.chatGroupCollection = db.collection("chatGroups");
    app.locals.messageCollection = db.collection("messages");
    console.log("✅ Connected to MongoDB on:", mongoUri);
  } catch (err) {
    console.error("❌ Connection to MongoDB failed:", err);
  }

  console.log("✅ Backend listening on port 8000!");
});
