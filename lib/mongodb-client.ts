import 'server-only';

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is missing from .env.local');
}

declare global {
  var mongoClient: MongoClient | undefined;
}

export const mongoClient = global.mongoClient ?? new MongoClient(uri);

if (process.env.NODE_ENV !== 'production') {
  global.mongoClient = mongoClient;
}

export const authDatabase = mongoClient.db();
