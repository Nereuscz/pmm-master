import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { upsertUserFromAzure } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || ""
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin"
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Runs only on first sign-in when account + profile are present
      if (account && profile) {
        const msId =
          (profile as { oid?: string }).oid ??
          (profile as { sub?: string }).sub ??
          token.sub ??
          "";
        const email =
          (profile as { email?: string }).email ?? (token.email as string | undefined) ?? "";

        try {
          const user = await upsertUserFromAzure({ msId, email });
          token.userId = user.id;
          token.userRole = user.role;
        } catch {
          // DB not available – proceed without persisted role
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
    }
  }
};
