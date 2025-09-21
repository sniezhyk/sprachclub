import * as z from "zod";

interface UserInfo {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  is_host: boolean;
  roles: "user" | "host";
}

const UserInfoSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  birth_date: z.string(),
  is_host: z.boolean(),
  roles: z.array(z.enum(["user", "host"])).min(1),
});

export async function checkAuth(): Promise<UserInfo | null> {
  const res = await fetch("http://localhost:5000/api/auth/me", {
    credentials: "include",
  });
  if (res.ok) {
    const data = await res.json();
    const parsed = UserInfoSchema.safeParse(data.user);
    if (parsed.success) {
      return parsed.data;
    } else {
      console.error("Failed to parse user info:", parsed.error);
      throw new Error("Failed to parse user info" + parsed.error.message);
    }
  } else if (res.status === 401) {
    return null;
  } else {
    console.error("Failed to fetch user info:", res);
    throw new Error("Failed to fetch user info" + res.status);
  }
}
