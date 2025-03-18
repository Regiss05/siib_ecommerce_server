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
import http from "http"; // Import HTTP to attach WebSockets
import { Server } from "socket.io"; // Import WebSocket Server
import env from './environments';
import mountPaymentsEndpoints from './handlers/payments';
import mountUserEndpoints from './handlers/users';
import mountProductEndpoints from './handlers/products';
import categoryRoutes from "./handlers/category";
import mountCartEndpoints from "./handlers/cart";
import mountShopEndpoints from "./handlers/shops";
import mountChatEndpoints from "./handlers/chat"; // Import chat endpoints

// We must import typedefs for ts-node-dev to pick them up when they change (even though tsc would supposedly
// have no problem here)
// https://stackoverflow.com/questions/65108033/property-user-does-not-exist-on-type-session-partialsessiondata#comment125163548_65381085
import "./types/session";

const dbName = env.mongo_db_name;
const mongoUri = `mongodb+srv://${env.mongo_host}/${dbName}`;
const mongoClientOptions = {
  authSource: "admin",
  auth: {
    username: env.mongo_user,
    password: env.mongo_password,
  },
}
//
// I. Initialize and set up the express app and various middlewares and packages:
//

const app: express.Application = express();

// Log requests to the console in a compact format:
app.use(logger('dev'));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.frontend_url,
    methods: ["GET", "POST"],
  },
});

// Make io available to routes
app.locals.io = io;

io.on("connection", (socket) => {
  console.log(`🔗 User connected: ${socket.id}, IP: ${socket.handshake.address}`);

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});


// Full log of all requests to /log/access.log:
app.use(logger('common', {
  stream: fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), { flags: 'a' }),
}));

// Enable response bodies to be sent as JSON:
app.use(express.json())

// Handle CORS:
app.use(cors({
  origin: env.frontend_url,
  credentials: true
}));

// Handle cookies 🍪
app.use(cookieParser());

// Use sessions:
app.use(session({
  secret: env.session_secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    mongoOptions: mongoClientOptions,
    dbName: dbName,
    collectionName: 'user_sessions'
  }),
}));


//
// II. Mount app endpoints:
//

// Payments endpoint under /payments:
const paymentsRouter = express.Router();
mountPaymentsEndpoints(paymentsRouter);
app.use('/payments', paymentsRouter);

// User endpoints (e.g signin, signout) under /user:
const userRouter = express.Router();
mountUserEndpoints(userRouter);
app.use('/user', userRouter);

// Hello World page to check everything works:
app.get('/', async (_, res) => {
  res.status(200).send({ message: "Hello, World!" });
});

const productRouter = express.Router();
mountProductEndpoints(productRouter);
app.use('/uploads', express.static('uploads'));
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

// Mount chat endpoints
const chatRouter = express.Router();
mountChatEndpoints(chatRouter);
app.use("/chat", chatRouter);


// III. Boot up the app:

server.listen(8000, async () => {
  try {
    const client = await MongoClient.connect(mongoUri, mongoClientOptions);
    const db = client.db(dbName);
    app.locals.orderCollection = db.collection("orders");
    app.locals.userCollection = db.collection("users");
    app.locals.productCollection = db.collection("products");
    app.locals.cartCollection = db.collection("cart");
    app.locals.shopCollection = db.collection("shops");
    app.locals.chatGroupCollection = db.collection("chatGroups"); // Add chat group collection
    app.locals.messageCollection = db.collection("messages"); // Add messages collection
    console.log("✅ Connected to MongoDB on: ", mongoUri);
  } catch (err) {
    console.error("❌ Connection to MongoDB failed: ", err);
  }

  console.log("✅ Backend listening on port 8000!");
});