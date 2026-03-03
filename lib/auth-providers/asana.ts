import type { OAuthConfig } from "next-auth/providers/oauth";

const ASANA_SCOPE =
  "users:read default projects:read tasks:read tasks:write tasks:delete";

export interface AsanaProfile {
  gid: string;
  name?: string;
  email?: string;
  photo?: { image_128x128?: string };
}

export default function AsanaProvider(
  options: Partial<OAuthConfig<AsanaProfile>>
): OAuthConfig<AsanaProfile> {
  return {
    id: "asana",
    name: "Asana",
    type: "oauth",
    clientId: process.env.ASANA_CLIENT_ID,
    clientSecret: process.env.ASANA_CLIENT_SECRET,
    authorization: {
      url: "https://app.asana.com/-/oauth_authorize",
      params: {
        scope: ASANA_SCOPE,
        response_type: "code",
      },
    },
    token: "https://app.asana.com/-/oauth_token",
    userinfo: {
      url: "https://app.asana.com/api/1.0/users/me",
      async request({ tokens }) {
        const res = await fetch("https://app.asana.com/api/1.0/users/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const json = (await res.json()) as { data?: AsanaProfile };
        return json.data ?? {};
      },
    },
    profile(profile) {
      return {
        id: profile.gid,
        name: profile.name ?? "",
        email: profile.email ?? "",
        image: profile.photo?.image_128x128,
      };
    },
    style: {
      logo: "",
      text: "#fff",
      bg: "#f06a6a",
    },
    ...options,
  };
}
