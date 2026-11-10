import { getAuth } from '../../../../lib/auth';

async function authHandler(request: Request) {
  const auth = await getAuth();

  return auth.handler(request);
}

export { authHandler as GET, authHandler as POST };
