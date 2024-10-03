# Middleware HQ - Manager Dash

Improve your engineering team productivity. Consistently.

Next.js, Typescript, Redux (+RTK), Knex (postgres), MaterialUI

## Development

1. Acquire the environment variable files. Store them in .local_envs dir at the project root. If you received multiple files, such as `.env.common`, `.env.local`, and `.env.staging`, store them inside the .local_envs dir. If you received something like a `local_envs.zip`, create a folder called `.local_envs`, and extract the contents of the zip within in.

2. Run `yarn env`. This will generate a `.env.local` file in the project root.

3. Acquire the private key file from a team member, and save it as ~/.ssh/jump_server_pk.

4. Export an environment variable in your .bashrc/.zshrc file called `$STAGE_TUNNEL`. Ask a team member on how to define this.

5. Run commands:
```
yarn install --frozen-lockfile
yarn stage-tun
```


## Notes

**HTTPS Server**
Use `yarn https` to start.
Naturally, auth and cookies are separate for the HTTP and HTTPS server.
If you were developing using `yarn dev` and then switched to `yarn https`, you'll need to login again. But since it's still pointing to staging, the data on the UI would remain the same.

**Slack**
If working with Slack integration linking logic, use `yarn https`.
However, if working with the Slack Bot API request/response logic, use `yarn dev` and then use `ngrok` or something.

**Logrocket**
LR operates over a nextjs rewrite path.
However, a rewrite from an HTTP path to an HTTPS path is not supported, hence unless you're using `yarn https`, LR won't work locally even if you tried.

If you must run it locally, do the following:
1. In `src/components/AppHead.tsx`, remove the check that prevents LR from running.
2. Run `yarn https`.
3. Once the app loads, LR should work as expected over the rewrite path.
