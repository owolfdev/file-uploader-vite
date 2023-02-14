const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const cors = require("cors");
const app = express();
require("dotenv").config();

app.use(cors());

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  },
});

app.get("/", (req, res) => {
  res.send(`Hello, ${process.env.SOME_VAR}!`);
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
// const bucket = storage.bucket("owolf-tester");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

app.get("/check", async (req, res, next) => {
  try {
    const filename = req.query.filename;

    if (!filename) {
      return res.status(400).send("Filename parameter is missing.");
    }

    const file = bucket.file(filename);
    const [exists] = await file.exists();

    res.status(200).send({ exists });
  } catch (err) {
    next(err);
  }
});

app.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const blob = bucket.file(req.file.originalname);

    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    blobStream.on("error", (err) => {
      next(err);
    });

    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.status(200).send(`File uploaded to: ${publicUrl}`);
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    next(err);
  }
});

app.delete("/delete", async (req, res, next) => {
  try {
    const filename = req.query.filename;

    if (!filename) {
      return res.status(400).send("Filename parameter is missing.");
    }

    const file = bucket.file(filename);
    await file.delete();

    res.status(200).send({ message: "File deleted successfully." });
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}.`);
});
