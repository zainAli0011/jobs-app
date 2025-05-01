# JobFinder Mobile App

A mobile app for searching and filtering job listings from the JobFinder platform.

## Features

- Browse job listings with infinite scroll
- Filter jobs by category, location, and job type
- Search jobs by title, company, or keywords
- View job details
- Apply for jobs by opening the application page in a browser

## Screenshots

![JobFinder Mobile App](./assets/images/screenshot.png)

## Tech Stack

- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Expo Router](https://docs.expo.dev/routing/introduction/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v14 or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/jobs-site.git
   cd jobs-site/jobfinder-mobile
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server
   ```bash
   npm start
   # or
   yarn start
   ```

4. Run on a simulator or device
   - Press `a` in the terminal to run on Android simulator
   - Press `i` in the terminal to run on iOS simulator
   - Scan the QR code with the Expo Go app on your device

## Configuration

By default, the app will try to connect to the API server at `http://10.0.2.2:3000/api` when running on an Android emulator. This IP maps to the host machine's localhost. For iOS simulators, it uses `http://localhost:3000/api`.

If you need to change the API URL, update the `API_URL` constant in `services/api.ts`.

## Connecting to the Backend

This mobile app is designed to work with the JobFinder web app backend. Make sure you have the backend server running locally on port 3000 or update the API URL to point to your deployed backend.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
