This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

1. run `nvm use` to run the right version of nodejs
2. run `npm install` to install the dependencies
3. run `touch .env.local` to create your local environment variables
4. copy these variables into the `.env.local`. You can get the variables from our deployment page.

```
POSTGRES_URL=""
POSTGRES_USER=""
POSTGRES_HOST=""
SUPABASE_JWT_SECRET=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
POSTGRES_PRISMA_URL=""
POSTGRES_PASSWORD=""
POSTGRES_DATABASE=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
POSTGRES_URL_NON_POOLING=""
```

5. now you can run the dev server by running `npm run dev`
