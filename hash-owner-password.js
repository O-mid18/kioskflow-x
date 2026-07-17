// Run this locally: node hash-owner-password.js
// It will ask for your new owner-panel password (typed locally, never sent
// anywhere) and print the resulting hash string. Send ONLY that printed
// hash (starts with "v2:") back — never the password itself.

const crypto = require("crypto");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Neues Owner-Passwort eingeben (wird nicht gespeichert oder gesendet): ", (password) => {
  const salt = crypto.createHash("sha256").update(password + Date.now() + Math.random()).digest("hex").slice(0, 32);
  const hash = "v2:" + salt + ":" + crypto.pbkdf2Sync(password, salt, 200_000, 32, "sha512").toString("hex");
  console.log("\nFertig! Schick NUR diese Zeile zurück (nicht das Passwort selbst):\n");
  console.log(hash);
  rl.close();
});
