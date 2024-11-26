import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import verifyToken from "./middleware/userAuth.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("combined"));
app.disable("x-powered-by");

const services = [
  {
    route: "/user",
    target: "http://user-service:4042",
    role: "user",
  },
  {
    route: "/admin",
    target: "http://admin-service:4041",
    role: "admin",
  },
];

services.forEach((service) => {
  app.use(
    service.route,
    verifyToken(service.role),
    createProxyMiddleware({
      target: service.target,
      changeOrigin: true,
      secure: false,
    })
  );
});

app.listen(process.env.PORT || 4040, () =>
  console.log("API Gateway running...")
);
