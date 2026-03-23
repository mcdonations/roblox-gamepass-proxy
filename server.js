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
// Récupère les gamepasses CRÉÉS par le joueur (pour les afficher sur son stand)
// ════════════════════════════════════════════════════════

app.get("/api/gamepasses/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ success: false, error: "UserID invalide" });
  }

  console.log(`📡 Récupération des gamepasses créés par UserID: ${userId}`);

  try {
    const gamepasses = [];
    let cursor = "";
    let hasMore = true;

    while (hasMore) {
      // ✅ Bon endpoint : gamepasses créés par l'utilisateur
      const url = `https://games.roblox.com/v1/users/${userId}/game-passes?limit=100&sortOrder=Asc${cursor ? "&cursor=" + cursor : ""}`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (!response.ok) {
        throw new Error(`Roblox API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of data.data) {
        // Récupérer l'icône via thumbnails
        let iconImageId = 0;
        try {
          const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${item.id}&size=150x150&format=Png`, {
            headers: { "Accept": "application/json" }
          });
          const thumbData = await thumbRes.json();
          if (thumbData.data && thumbData.data[0] && thumbData.data[0].imageUrl) {
            const imageUrl = thumbData.data[0].imageUrl;
            const match = imageUrl.match(/\/(\d+)\//);
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

      if (data.nextPageCursor) {
        cursor = data.nextPageCursor;
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
});
