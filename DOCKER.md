# Running the backend in Docker

## Quick start

```bash
cd backend
cp .env.example .env   # fill in your real values first — see README.md
cd ..
docker compose up --build
```

Backend is now on `http://localhost:5000`. Check it's alive:

```bash
curl http://localhost:5000/api/health
```

## What's containerized (and what isn't, on purpose)

Only the **backend** runs in Docker here. The frontend is a static Vite
build — per the deployment plan from earlier in this project, it's meant
to go to Netlify (or any static host), not run in a container. If you
later want to self-host everything instead of using Netlify, say so and
a simple Nginx-serving-the-built-files container is a small addition.

## Uploads persist across restarts

If `UPLOAD_MODE=local` (the default), uploaded files live in
`backend/uploads/` on your host machine, mounted into the container — so
rebuilding or restarting the container doesn't lose them. If you're on
`UPLOAD_MODE=s3`, this volume is unused (files live in S3 instead).

## On "load balancing" / running more than one instance

If you meant you want the backend to handle more traffic by running
multiple instances behind a load balancer, rather than a messaging
system: that's a real, sensible thing to want, and Docker gets you most
of the way there (spin up more replicas, put Nginx or a cloud load
balancer in front). The one thing to know before doing that: this app
uses Socket.io for real-time chat, and Socket.io needs a shared adapter
(commonly Redis) once you run more than one backend instance — otherwise
a chat message sent to a socket connected to instance A never reaches a
recipient connected to instance B. This isn't set up yet because there's
no real multi-instance traffic to justify it today; it's a well-known,
contained addition (`socket.io-redis` or the newer `@socket.io/redis-adapter`)
whenever you actually need to scale horizontally — flag it and it can be
added at that point.
