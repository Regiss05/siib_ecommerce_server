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
import http from 'http';
import { Server } from 'socket.io';
import env from './environments';

import mountPaymentsEndpoints from './handlers/payments';
import mountUserEndpoints from './handlers/users';
import mountProductEndpoints from './handlers/products';
import categoryRoutes from './handlers/category';
import mountCartEndpoints from './handlers/cart';
import mountShopEndpoints from './handlers/shops';
import mountChatEndpoints from './handlers/chat';
import './types/session';

// === MongoDB Config ===
const dbName = env.mongo_db_name;
const mongoUri = `mongodb+srv://${env.mongo_host}/${dbName}`;
const mongoClientOptions = {
  authSource: 'admin',
  auth: {
    username: env.mongo_user,
    password: env.mongo_password,
  },
};

// === Initialize Express App ===
const app: express.Application = express();

// === Trust Proxy (for HTTPS via Nginx) ===
app.set('trust proxy', true);

// === Force HTTPS Redirect (Only in production) ===
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// === Logging ===
app.use(logger('dev'));
app.use(
  logger('common', {
    stream: fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), { flags: 'a' }),
  })
);

// === Middleware ===
app.use(express.json());
app.use(cors({ origin: [env.frontend_url, 'https://pi.siibarnut.com'], credentials: true }));
app.use(cookieParser());
app.use(
  session({
    secret: env.session_secret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      mongoOptions: mongoClientOptions,
      dbName: dbName,
      collectionName: 'user_sessions',
    }),
  })
);

// === HTTP Server & WebSocket ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [env.frontend_url, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.locals.io = io;

io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}, IP: ${socket.handshake.address}`);
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// === Routes ===
app.get('/', (_, res) => {
  res.status(200).send({ message: 'Backend is up!' });
});

const paymentsRouter = express.Router();
mountPaymentsEndpoints(paymentsRouter);
app.use('/payments', paymentsRouter);

const userRouter = express.Router();
mountUserEndpoints(userRouter);
app.use('/user', userRouter);

const productRouter = express.Router();
mountProductEndpoints(productRouter);
app.use('/uploads', express.static('uploads'));
app.use('/products', productRouter);

app.use('/categories', categoryRoutes);

const cartRouter = express.Router();
mountCartEndpoints(cartRouter);
app.use('/cart', cartRouter);

const shopRouter = express.Router();
mountShopEndpoints(shopRouter);
app.use('/shops', shopRouter);

const chatRouter = express.Router();
mountChatEndpoints(chatRouter);
app.use('/chat', chatRouter);

// === Server Start ===
const PORT = 5000;

server.listen(PORT, async () => {
  try {
    const client = await MongoClient.connect(mongoUri, mongoClientOptions);
    const db = client.db(dbName);

    app.locals.orderCollection = db.collection('orders');
    app.locals.userCollection = db.collection('users');
    app.locals.productCollection = db.collection('products');
    app.locals.cartCollection = db.collection('cart');
    app.locals.shopCollection = db.collection('shops');
    app.locals.chatGroupCollection = db.collection('chatGroups');
    app.locals.messageCollection = db.collection('messages');

    console.log(`✅ Connected to MongoDB: ${mongoUri}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }

  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
