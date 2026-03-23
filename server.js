const express = require("express");
const noblox = require("noblox.js");
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
  const userId = parseInt(req.params.userId);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ success: false, error: "UserID invalide" });
  }

  console.log(`📡 Récupération des gamepasses pour UserID: ${userId}`);

  try {
    const gamepasses = [];
    let page = noblox.getGamePasses;

    // Récupérer tous les gamepasses créés par le joueur
    const data = await noblox.getGamePasses(userId);

    for (const gp of data) {
      // Récupérer le prix
      let price = 0;
      try {
        const productInfo = await noblox.getProductInfo(gp.id);
        price = productInfo.PriceInRobux || 0;
      } catch (_) {}

      gamepasses.push({
        id: gp.id,
        name: gp.name,
        price: price,
        iconImageId: gp.iconImageAssetId || 0
      });

      console.log(`✅ Gamepass: ${gp.name} - ${price} R$`);
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
});
