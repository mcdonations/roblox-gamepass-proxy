const express = require("express");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

// ════════════════════════════════════════════════════════
// 🎮 GET /api/gamepasses/:userId
// ════════════════════════════════════════════════════════

app.get("/api/gamepasses/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ success: false, error: "UserID invalide" });
  }

  console.log(`📡 Récupération des gamepasses pour UserID: ${userId}`);

  try {
    const gamepasses = [];
    let cursor = "";
    let hasMore = true;

    while (hasMore) {
      const url = `https://www.roblox.com/users/inventory/list-json?userId=${userId}&assetTypeId=34&pageSize=100${cursor ? "&cursor=" + cursor : ""}`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      console.log(`🔍 Status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Roblox API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📦 Data reçue:`, JSON.stringify(data).substring(0, 200));

      // Format de la réponse inventory
      const items = data.Data?.Items || data.items || data.data || [];

      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        const assetId = item.Item?.AssetId || item.assetId || item.id;
        const name = item.Item?.Name || item.name || "Unknown";
        const price = item.Product?.PriceInRobux || item.price || 0;
        const imageId = item.Thumbnail?.Url?.match(/id=(\d+)/)?.[1] || 0;

        if (assetId) {
          gamepasses.push({
            id: assetId,
            name: name,
            price: price,
            iconImageId: parseInt(imageId) || 0
          });
          console.log(`✅ Gamepass: ${name} - ${price} R$`);
        }
      }

      // Pagination
      const nextCursor = data.Data?.NextPageCursor || data.nextPageCursor;
      if (nextCursor) {
        cursor = nextCursor;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ ${gamepasses.length} gamepasses récupérés pour ${userId}`);

    return res.json({
      success: true,
      userId: userId,
      count: gamepasses.length,
      gamepasses: gamepasses
    });

  } catch (err) {
    console.error("❌ Erreur:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ════════════════════════════════════════════════════════
// 🔍 GET /api/debug/:userId  -- Pour tester et voir la réponse brute
// ════════════════════════════════════════════════════════

app.get("/api/debug/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const url = `https://www.roblox.com/users/inventory/list-json?userId=${userId}&assetTypeId=34&pageSize=10`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    const text = await response.text();
    res.json({ status: response.status, body: text.substring(0, 2000) });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// ❤️ Health Check
// ════════════════════════════════════════════════════════

app.get("/", (req, res) => {
  res.json({ status: "✅ Online", message: "Roblox Gamepass Proxy actif !" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ════════════════════════════════════════════════════════
// 🚀 DÉMARRAGE
// ════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 Route: GET /api/gamepasses/:userId`);
  console.log(`🔍 Debug: GET /api/debug/:userId`);
});
