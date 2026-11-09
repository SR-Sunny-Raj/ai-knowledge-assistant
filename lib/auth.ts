import 'server-only';

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { nextCookies } from 'better-auth/next-js';
import { authDatabase, mongoClient } from './mongodb-client';

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from .env.local`);
  }

  return value;
}

export const auth = betterAuth({
  baseURL: requireEnvironmentVariable('BETTER_AUTH_URL'),

  database: mongodbAdapter(authDatabase, {
    client: mongoClient,
  }),

  socialProviders: {
    google: {
      clientId: requireEnvironmentVariable('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnvironmentVariable('GOOGLE_CLIENT_SECRET'),
    },
  },

  plugins: [nextCookies()],
});
