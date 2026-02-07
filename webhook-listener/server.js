import express from "express";
import crypto from "crypto";
import { spawn } from "child_process";
import "dotenv/config";

const app = express();

// On récupère les octets bruts pour valider la signature de GitHub
app.post("/webhook/github", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    const sigHeader = req.header("X-Hub-Signature-256");

    if (!sigHeader) return res.status(401).send("Signature manquante");

    // Calcul de la signature attendue
    const expected = "sha256=" + crypto.createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    // Comparaison sécurisée
    const ok = crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));

    if (!ok) return res.status(401).send("Signature invalide");

    const payload = JSON.parse(req.body.toString("utf8"));
    const event = req.header("X-GitHub-Event");

    // On n'agit que si c'est un "push" sur la bonne branche
    if (event === "push" && payload.ref === `refs/heads/${process.env.TARGET_BRANCH}`) {
      console.log("Push détecté ! Lancement du déploiement...");
      
      const script = process.platform === "win32" ? "deploy.ps1" : "deploy.sh";
      const cmd = process.platform === "win32" ? "powershell.exe" : "bash";
      const args = process.platform === "win32" ? ["-ExecutionPolicy", "Bypass", "-File", script] : [script]; 

      const child = spawn(cmd, args, { env: process.env, stdio: "inherit" });

      child.on("exit", (code) => {
        if (code === 0) console.log("Déploiement réussi !");
        else console.error("Échec du déploiement, code:", code);
      });

      return res.status(200).send("Déploiement lancé");
    }

    res.status(200).send("Événement ignoré");
  } catch (e) {
    console.error(e);
    res.status(500).send("Erreur serveur");
  }
});

const port = Number(process.env.WEBHOOK_PORT || 9000);
app.listen(port, () => console.log(`Serveur prêt sur http://localhost:${port}/webhook/github`));