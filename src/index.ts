import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, World!" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
