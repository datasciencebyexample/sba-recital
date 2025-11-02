# Recital Program Display System

A web-based system for displaying and managing recital programs with real-time updates.

## Features

- **Public Display** (`index.html`) - Shows current and upcoming performances for audience
- **Admin Panel** (`admin.html`) - Control which program is currently playing
- **Real-time Updates** - Public display updates automatically when admin makes changes
- **Flexible Backend** - Works with API backend or localStorage (no server required)
- **Multi-Device Sync** - With API backend, syncs across all devices/browsers
- **Image Support** - Each program can have an associated image
- **CSV-based** - Easy to edit program data

## Folder Structure

```
.
├── index.html           # Public display page
├── admin.html           # Admin control panel
├── script.js            # Public display logic
├── admin.js             # Admin panel logic
├── styles.css           # Shared styles
├── API.md               # API documentation
├── data/
│   ├── programs.csv     # Program data
│   └── images/          # Program images
│       ├── 1.jpg
│       ├── 2.jpg
│       └── ...
```

## CSV Format

The `data/programs.csv` file contains program information:

```csv
index,title,performances,image
1,Opening Ceremony,"Welcome Address, National Anthem",1.jpg
2,Piano Solo,"Chopin - Nocturne, Debussy - Clair de Lune",2.jpg
```

**Columns:**
- `index` - Program number (unique identifier)
- `title` - Program title
- `performances` - List of performances (use quotes if contains commas)
- `image` - Image filename (stored in `data/images/`)

**Note:** The current program status is managed separately (via API or localStorage), not in the CSV file.

## Setup Options

### Option 1: LocalStorage Only (No Backend)

Perfect for single-device setup or testing.

1. Start a local web server (required for loading CSV files):
   ```bash
   # Python 3
   python3 -m http.server 8000

   # Or Python 2
   python -m SimpleHTTPServer 8000

   # Or Node.js
   npx http-server
   ```

2. In both `admin.js` and `script.js`, configure to use localStorage:
   ```javascript
   const API_CONFIG = {
       endpoint: '/api/current-program',
       useAPI: false  // Disable API, use localStorage
   };
   ```

3. Open your browser:
   - Admin panel: `http://localhost:8000/admin.html`
   - Public display: `http://localhost:8000/index.html`

4. Both admin and public pages must be open in the **same browser** for sync.

### Option 2: With API Backend (Recommended for Production)

Perfect for multi-device setup - control from any device, display on any screen.

1. Implement the API endpoints (see [API.md](API.md) for details):
   - `GET /api/current-program` - Fetch current program
   - `POST /api/current-program` - Update current program

2. In both `admin.js` and `script.js`, configure your API:
   ```javascript
   const API_CONFIG = {
       endpoint: 'https://your-api.com/api/current-program',
       useAPI: true  // Enable API
   };
   ```

3. Start your local web server and open the pages:
   ```bash
   python3 -m http.server 8000
   ```

4. Open admin and public pages on **any device/browser** - they all sync via API!

**Benefits:**
- ✅ Sync across multiple devices/browsers
- ✅ Control from backstage, display on multiple screens
- ✅ Multiple admins can update from different devices
- ✅ State persists on server (not just in browser)

See [API.md](API.md) for complete API documentation and implementation examples in Node.js, Python, and Go.

## Usage

### How It Works

The system tracks which program is currently playing using either:

**LocalStorage Mode** (default):
- Admin panel sets current program in browser localStorage
- Public display reads from localStorage and updates automatically
- Both pages must be open in the **same browser** to stay in sync
- Changes persist even if you refresh the page
- Works offline, no backend needed

**API Mode** (recommended for production):
- Admin panel POSTs updates to your API endpoint
- Public display polls API every 2 seconds for updates
- Syncs across **all devices and browsers**
- State persisted on your server
- Multiple admins can control from different devices

### Managing Programs

1. Open `admin.html` in your browser
2. Click "Set Current" next to a program to mark it as currently playing
3. Click "Clear All" to reset (no program playing)
4. The public display updates automatically (within 2 seconds)

### For Live Events

**Recommended Setup:**
- Open admin panel on a tablet/laptop backstage
- Open public display on the same device (different tab/window)
- Connect the device to a projector/screen for the audience
- Admin controls one tab, audience sees the other

### Adding Program Images

1. Save images to `data/images/` folder
2. Name them according to the program index (e.g., `1.jpg`, `2.jpg`)
3. Reference the filename in the CSV `image` column
4. Supported formats: JPG, PNG, GIF

### Editing Programs

Edit `data/programs.csv` directly:

1. Open in a text editor or spreadsheet program
2. Add/remove/edit rows
3. Use quotes around fields containing commas
4. Save the file
5. Refresh the admin page to see changes

## Display Modes

### Public Display (`index.html`)
- Shows "Now Playing" with large image
- Shows "Up Next" with smaller preview
- Full program list with status indicators
- Auto-updates when admin changes current program
- Checks for updates every 2 seconds
- No controls (read-only)

### Admin Panel (`admin.html`)
- Shows all programs with thumbnails
- "Set Current" button to mark a program as active
- "Clear All" to reset (no program playing)
- "Refresh" to reload program list from CSV
- Visual indicators showing which program is active
- Changes saved to browser localStorage instantly

## Styling

The system uses a dark, elegant design with:
- Glassmorphism effects
- Red accent colors (#e74c3c)
- Status indicators (green = playing, orange = upcoming, gray = completed)
- Responsive layout for mobile devices

Customize by editing `styles.css`.

## Tips

- Keep image sizes reasonable (recommend < 500KB per image)
- Use descriptive program titles
- Test on multiple screen sizes
- For live events, set admin panel on a tablet backstage
- Project public display on screens for audience

## Troubleshooting

**Images not showing?**
- Check file paths in CSV match actual files in `data/images/`
- Ensure images are web-compatible formats (JPG, PNG)
- Check browser console for 404 errors
- Make sure you're running a local server (not just opening HTML files)

**Public display not updating?**
- Ensure both admin and public pages are open in the **same browser**
- Check browser console for errors
- Try manually refreshing the page
- Verify localStorage is enabled (not in private/incognito mode)

**Changes not persisting?**
- localStorage is browser-specific - changes won't sync across different browsers
- Private/incognito mode may not save localStorage
- Try clearing browser cache and reloading

**CSV not loading?**
- Make sure you're running a local web server (required for fetch API)
- Check browser console for CORS errors
- Verify `data/programs.csv` file exists

## Browser Support

Works with modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Free to use and modify for your recitals and events.
