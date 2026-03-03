import type { NextAuthOptions } from "next-auth";
import AsanaProvider from "./auth-providers/asana";
import { upsertUserFromAsana } from "./db";
import { saveAsanaTokens } from "./asana-auth";

export const authOptions: NextAuthOptions = {
  providers: [AsanaProvider({})],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin?error=AuthError",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const asanaProfile = profile as { gid?: string; email?: string; name?: string };
        const asanaGid = asanaProfile.gid ?? token.sub ?? "";
        const email = asanaProfile.email ?? (token.email as string | undefined) ?? "";

        try {
          const user = await upsertUserFromAsana({
            asanaGid,
            email,
            name: asanaProfile.name,
          });
          token.userId = user.id;
          token.userRole = user.role;

          if (account.access_token && account.refresh_token) {
            const expiresIn =
              typeof account.expires_at === "number"
                ? Math.max(0, account.expires_at - Math.floor(Date.now() / 1000))
                : 3600;
            await saveAsanaTokens(
              user.id,
              account.access_token,
              account.refresh_token,
              expiresIn
            );
          }
        } catch {
          // DB not available – proceed without persisted role/tokens
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.role = (token.userRole as "Admin" | "PM" | "Viewer") ?? "PM";
      }
      return session;
    },
  },
};
