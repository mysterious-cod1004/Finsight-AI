import { currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) return null;

  let loggedIn = await db.user.findUnique({
    where: { clerkUserId: user.id },
  });

  if (loggedIn) return loggedIn;

  return await db.user.create({
    data: {
      clerkUserId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      name: user.fullName ?? "",
      imageUrl: user.imageUrl ?? "",
    },
  });
};
