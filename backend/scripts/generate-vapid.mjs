#!/usr/bin/env node
// Generates a VAPID key pair for Web Push and prints env-ready output.
// Usage: npm run generate-vapid
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\nAdd these to your environment (Railway variables / .env):\n');
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VITE_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log('\nAlso set VAPID_SUBJECT to a mailto: address or https: URL.\n');
