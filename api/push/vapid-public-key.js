export default function handler(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
}
