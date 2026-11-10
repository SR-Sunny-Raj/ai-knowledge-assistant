import 'server-only';

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { nextCookies } from 'better-auth/next-js';
import type { MongoClient } from 'mongodb';
import { connectToDatabase } from './db';

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from .env.local`);
  }

  return value;
}

function createAuth(client: MongoClient) {
  return betterAuth({
    baseURL: requireEnvironmentVariable('BETTER_AUTH_URL'),

    database: mongodbAdapter(client.db(), {
      client,
    }),

    socialProviders: {
      google: {
        clientId: requireEnvironmentVariable('GOOGLE_CLIENT_ID'),
        clientSecret: requireEnvironmentVariable('GOOGLE_CLIENT_SECRET'),
      },
    },

    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;

let cachedAuth: Auth | null = null;
let cachedAuthClient: MongoClient | null = null;

export async function getAuth() {
  const database = await connectToDatabase();
  const client = database.connection.getClient();

  if (!cachedAuth || cachedAuthClient !== client) {
    cachedAuth = createAuth(client);
    cachedAuthClient = client;
  }

  return cachedAuth;
}
