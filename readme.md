# Costa Rica Birds Gallery

A simple web application to display and browse birds of Costa Rica, with images from Wikipedia.

## Prerequisites

- A Mac computer
- Basic familiarity with the Terminal application
- Python 3 (macOS usually comes with Python pre-installed)

## Quick Setup Guide

### 1. Download the Files

There are two ways to get the files:

**Option A: Download ZIP File**
1. Click the green "Code" button at the top of this repository
2. Select "Download ZIP" from the dropdown menu
3. Unzip the downloaded file to a location of your choice (e.g., your Desktop)

**Option B: Clone with Git** (if you have Git installed)
1. Open Terminal
2. Navigate to where you want to store the project:
   ```
   cd ~/Desktop
   ```
3. Clone the repository:
   ```
   git clone https://github.com/username/birds-of-costa-rica.git
   ```
4. Navigate into the project folder:
   ```
   cd birds-of-costa-rica
   ```

### 2. Start a Local Web Server

1. Open Terminal if not already open
2. Navigate to the project folder containing the files:
   ```
   cd ~/path/to/birds-of-costa-rica
   ```
   Where `~/path/to/birds-of-costa-rica` is the actual path to your unzipped folder

3. Start a Python web server:
   ```
   python3 -m http.server 8000
   ```
   If that doesn't work, try:
   ```
   python -m http.server 8000
   ```

4. You should see a message like: `Serving HTTP on :: port 8000 (http://[::]:8000/) ...`

### 3. Access the Application

1. Open a web browser (Safari, Chrome, Firefox, etc.)
2. Go to the address:
   ```
   http://localhost:8000
   ```
3. You should now see the Birds of Costa Rica gallery

### 4. Stop the Server

When you're done:
1. Go back to the Terminal window
2. Press `Ctrl+C` to stop the server
3. You can close the Terminal window

## Using the Application

- Browse through different bird categories
- Click on any bird image to view additional photos (if available)
- Click on a bird's name to view its Wikipedia page
- Use the search field to filter birds by name

## Troubleshooting

- **"Address already in use" error**: Try using a different port number:
  ```
  python3 -m http.server 8080
  ```
  Then visit `http://localhost:8080` in your browser

- **Blank page or errors loading images**: Check your internet connection, as the app needs to access Wikipedia's API

- **Missing bird images**: Some birds may not have images in Wikipedia or Wikimedia Commons. The application will display a placeholder instead.

## Files in this Project

- `index.html`: Main HTML file
- `styles.css`: Styling for the application
- `script.js`: JavaScript code that fetches and displays bird data
- `birds_of_costa_rica.json`: Data file containing bird information
- `.gitignore`: Git configuration file (can be ignored)