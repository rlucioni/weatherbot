# weatherbot

A weather service that sends a more approachable version of the forecast and forecast discussion from the National Weather Service.

## Quickstart

Use [nvm](https://github.com/creationix/nvm) to install Node.js and npm:

```bash
$ nvm install
$ nvm use
```

Install dependencies:

```bash
$ npm install
```

## Testing

To test the function locally:

```bash
$ make serve
```

Then ping the server to invoke the function:

```bash
$ make ping
```

## Deployment

Enable the required services:

```bash
$ make enable
```

Deploy the function to GCP:

```bash
$ make deploy
```

Schedule invocation of the function:

```bash
$ make schedule
```

Update the scheduled invocation:

```bash
$ make reschedule
```
