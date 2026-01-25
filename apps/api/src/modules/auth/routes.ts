import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';
import { config } from '../../config.js';
import { githubService } from '../../services/github.js';

export async function authRoutes(app: FastifyInstance) {
  // Redirect to GitHub OAuth
  app.get('/github', async (request, reply) => {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      scope: 'repo read:user user:email',
      redirect_uri: `${config.domain.apiUrl}/api/auth/github/callback`,
    });
    reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  // GitHub OAuth callback
  app.get('/github/callback', async (request, reply) => {
    const { code } = request.query as { code: string };

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
      }),
    });

    const { access_token } = (await tokenResponse.json()) as { access_token: string };

    // Get user info from GitHub
    const octokit = githubService.getOctokit(access_token);
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();

    // Check if user exists
    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.githubId, String(githubUser.id)));

    if (!user) {
      // Check if this is the first user (make admin)
      const allUsers = await db.select().from(schema.users);
      const isFirstUser = allUsers.length === 0;

      const newUser = {
        id: nanoid(),
        githubId: String(githubUser.id),
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken: access_token,
        isAdmin: isFirstUser,
      };

      await db.insert(schema.users).values(newUser);
      user = { ...newUser, plan: 'free' as const, createdAt: new Date() };
    } else {
      // Update access token
      await db
        .update(schema.users)
        .set({ accessToken: access_token })
        .where(eq(schema.users.id, user.id));
    }

    // Generate JWT
    const token = app.jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.isAdmin },
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    reply.redirect(`${config.domain.webUrl}/auth/callback?token=${token}`);
  });

  // Get current user
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (request) => {
    const { id } = request.user as { id: string };
    const [user] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
        plan: schema.users.plan,
        isAdmin: schema.users.isAdmin,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id));

    return user;
  });

  // List user's GitHub repos
  app.get('/repos', { preHandler: [(app as any).authenticate] }, async (request) => {
    const { id } = request.user as { id: string };
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return githubService.listRepos(user.accessToken);
  });
}
