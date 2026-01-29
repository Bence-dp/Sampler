# Sampler

This Sampler project was made for the Web course at Université Côte d'Azur.

![Picture 1](.readme-src/img/01.png)

## Authors

- Bence DI PLACIDO
- Daniel CARRIBA NOSRATI

This project was made using the slides and the provided examples from Michel BUFFA.

## Requirements

- [Node.js](https://nodejs.org/) is required to run the server.

## Clone the repository

```bash
git clone https://github.com/Bence-dp/Sampler.git
cd Sampler
```

## How to use

To run the project, first run the server using [Node.js](https://nodejs.org/), and then run the client (with [Live Server for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for example)

### Run the server
```bash
cd server
npm i
npm run dev
```

### Run the client

```bash
cd client
```

You may run the client with [Live Server for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or any other local development server.

### Run the `Sampler Preset Manager` Angular app

```bash
cd preset-manager
npm i
ng serve
```

## Implemented features

### The Sampler

- A sampler containing multiple presests

![Picture 2](.readme-src/img/02.png)

- A canvas to see the waveform of the currently played sound
- Trimbars to adjust the currently played sound (the trimbars are remembered for each sound)

![Picture 3](.readme-src/img/03.png)

### Recorder to add new audio samples

Example showing how to add a new audio sample :

1) Click on `Record` to start recording your audio sample, and `Stop` to stop the recording.

![Picture 4](.readme-src/img/04.png)

![Picture 5](.readme-src/img/05.png)

2) Upload the audio sample to the server using `Send to Server`.

![Picture 6](.readme-src/img/06.png)

![Picture 7](.readme-src/img/07.png)

![Picture 8](.readme-src/img/08.png)

![Picture 9](.readme-src/img/09.png)

3) Access your recorded audio samples in the new preset that was added.

![Picture 10](.readme-src/img/10.png)

![Picture 11](.readme-src/img/11.png)

### Responsive layout

The website has a responsive layout when resizing the window.

![Picture 01](.readme-src/img/01.png)

![Picture 12](.readme-src/img/12.png)

![Picture 13](.readme-src/img/13.png)
