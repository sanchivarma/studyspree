# LiveKit integration decision

The user selected **LiveKit Cloud** for real human video rooms on 15 October 2026. Keep the provider behind a media adapter so it can later target self-hosted LiveKit without rewriting the timer or character components.

## Cost boundaries

The free Build plan currently includes 5,000 participant-minutes and 50 GB downstream transfer. Its allowances are hard caps. Ship starts at USD 50/month. Consult the current pricing before activating paid usage; no paid-plan activation or purchase is authorised by this implementation task.

Sources: [pricing](https://livekit.com/pricing), [quotas](https://docs.livekit.io/deploy/admin/quotas-and-limits/).

The eight GIF study partners must render as application assets. They must never join a LiveKit room, appear as fabricated online humans, or consume LiveKit participant minutes. Personal timers and local self-view must work without LiveKit credentials.

## Required configuration for the future room feature

Server environment variables:

```dotenv
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Obtain these from the user's LiveKit Cloud project. Never commit credentials or expose the API secret to browser code. An authorised room-token endpoint may return the connection URL and a short-lived participant token after checking Supabase identity and room membership. Do not trust browser-supplied participant identities, publishing permissions, or room names.

Use a separate opt-in publisher for shared camera video. The existing `useLocalCamera` and `SelfView` stay local-only. No microphone capture, recording, or automatic camera publication is implied by joining a room.

## Self-hosting later

Self-hosting can run on a hosted Linux VM; a personal laptop does not need to stay on. The server must be available when rooms are used. Deployment includes DNS, TLS, firewall/network configuration, updates, monitoring, and host/bandwidth costs. It is a separate infrastructure deployment, not a Vercel request handler.

Reference: [official VM deployment guide](https://docs.livekit.io/transport/self-hosting/vm/).
