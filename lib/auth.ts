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
        } catch (err) {
          // V produkci logujeme jen obecnou zprávu, abychom nevystavili DB detail
          if (process.env.NODE_ENV === "development") {
            console.error("[auth] JWT callback DB error – user will have no role/id:", err instanceof Error ? err.message : err);
          } else {
            console.error("[auth] JWT callback DB error – user will have no role/id");
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      // token.userId může být undefined, pokud JWT callback selhal (DB error) –
      // nastavíme bezpečný fallback, aby session.user.id nikdy nebyl undefined
      session.user.id = token.userId ?? token.sub ?? "";
      session.user.role = (token.userRole as "Admin" | "PM" | "Viewer") ?? "Viewer";
      return session;
    },
  },
};
