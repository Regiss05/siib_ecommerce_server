import { Router, Request, Response } from "express";
import platformAPIClient from "../services/platformAPIClient";

export default function mountUserEndpoints(router: Router) {
  router.post("/signin", async (req: Request, res: Response): Promise<void> => {
    const auth = req.body.authResult;
    const userCollection = req.app.locals.userCollection;

    try {
      // Verify the user's access token with the /me endpoint:
      const me = await platformAPIClient.get(`/v2/me`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      console.log(me.data);
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "Invalid access token" });
      return;
    }

    let currentUser = await userCollection.findOne({ uid: auth.user.uid });

    if (currentUser) {
      await userCollection.updateOne(
        { _id: currentUser._id },
        {
          $set: {
            accessToken: auth.accessToken,
          },
        }
      );
    } else {
      const insertResult = await userCollection.insertOne({
        username: auth.user.username,
        uid: auth.user.uid,
        roles: auth.user.roles,
        accessToken: auth.accessToken,
      });

      currentUser = await userCollection.findOne(insertResult.insertedId);
    }

    req.session.currentUser = currentUser;
    res.status(200).json({ message: "User signed in" });
  });

  router.get("/signout", async (req: Request, res: Response): Promise<void> => {
    req.session.currentUser = null;
    res.status(200).json({ message: "User signed out" });
  });
}
