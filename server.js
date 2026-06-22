const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    socket.on("chat:message", async (data) => {
      const nickname = data?.nickname?.trim();
      const content = data?.content?.trim();

      if (!nickname || !content || content.length > 500) return;

      try {
        const { createChatMessage } = require("./lib/chat-store.js");
        const message = createChatMessage(uuidv4(), nickname, content);
        io.emit("chat:message", message);
      } catch (err) {
        console.error("Chat message error:", err);
      }
    });

    socket.on("post:new", (post) => {
      io.emit("post:new", post);
    });

    socket.on("comment:new", (comment) => {
      io.emit("comment:new", comment);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> 판교 대신 전해드립니다 - http://${hostname}:${port}`);
  });
});
