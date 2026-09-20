import { app } from "./app";
import { PORT } from "./config/env.config";

const server = () => {
  app.listen(PORT, async () => {
    console.log("server is running on PORT", PORT);
  });
};

server();
