# Monitor the traffic delays and notify customer via SMS.

This is an example project using temporal workflows to monitor the traffic by the given route and check the delay, with SMS notification if it occurs.

## Configuration

- Rename file `.env.example` to `.env` and add the required credentials.
- Change the THRESHOLD constant value by choice in the file `shared.ts`

## Running the code

Install dependencies with `npm install`.

Run `temporal server start-dev` to start [Temporal Server](https://github.com/temporalio/cli/#installation).

1. In a shell, run `npm run start.watch` to start the Worker and reload it when code changes.
2. In another shell, run `npm run workflow` to run the Workflow Client.
3. Run `npm run format` to format your code according to the rules in `.prettierrc`.
4. Run `npm run lint` to lint your code according to the rules in `eslintrc.js`.
