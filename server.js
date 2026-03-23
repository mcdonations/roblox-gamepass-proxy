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
// 🔍 DEBUG - Teste tous les endpoints Roblox possibles
// GET /api/debug/:userId
// ════════════════════════════════════════════════════════

app.get("/api/debug/:userId", async (req, res) => {
  const userId = req.params.userId;
  const results = {};

  const endpoints = {
    "games_gamepasses":     `https://games.roblox.com/v1/users/${userId}/game-passes?limit=10&sortOrder=Asc`,
    "inventory_v1":         `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?assetType=GamePass&limit=10`,
    "inventory_v2":         `https://inventory.roblox.com/v2/users/${userId}/inventory?assetTypes=GamePass&limit=10`,
    "catalog_search":       `https://catalog.roblox.com/v1/search/items?category=GamePass&creatorType=User&creatorTargetId=${userId}&limit=10`,
    "develop_gamepasses":   `https://develop.roblox.com/v1/user/game-passes?userId=${userId}&limit=10`,
  };

  for (const [name, url] of Object.entries(endpoints)) {
    try {
      const r = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });
      const text = await r.text();
      results[name] = {
        status: r.status,
        body: text.substring(0, 500)
      };
    } catch (e) {
      results[name] = { error: e.message };
    }
  }

  res.json(results);
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
      const url = `https://games.roblox.com/v1/users/${userId}/game-passes?limit=100&sortOrder=Asc${cursor ? "&cursor=" + cursor : ""}`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });

      console.log(`🔍 Status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Roblox API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.data || [];

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        let iconImageId = 0;
        try {
          const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${item.id}&size=150x150&format=Png`);
          const thumbData = await thumbRes.json();
          if (thumbData.data?.[0]?.imageUrl) {
            const match = thumbData.data[0].imageUrl.match(/\/(\d+)\//);
            if (match) iconImageId = parseInt(match[1]);
          }
        } catch (_) {}

        gamepasses.push({
          id: item.id,
          name: item.name,
          price: item.price || 0,
          iconImageId: iconImageId
        });

        console.log(`✅ Gamepass: ${item.name} - ${item.price} R$`);
      }

      cursor = data.nextPageCursor || "";
      hasMore = !!data.nextPageCursor;
    }

    console.log(`✅ ${gamepasses.length} gamepasses récupérés`);

    return res.json({
      success: true,
      userId: userId,
      count: gamepasses.length,
      gamepasses: gamepasses
    });

  } catch (err) {
    console.error("❌ Erreur:", err.message);
    return res.status(500).json({ success: false, error: err.message });
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
  console.log(`🌐 /api/gamepasses/:userId`);
  console.log(`🔍 /api/debug/:userId`);
});
