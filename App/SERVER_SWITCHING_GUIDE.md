# Server Switching Feature - Implementation Guide

## Overview
This feature allows users to switch between Alpha and Beta API servers in the React Native application. When switching servers, the app automatically refreshes all registration data from the newly selected server.

## Changes Made

### 1. **services.ts** - Core Service Updates

#### New Constants
- `API_SERVERS`: Object containing both server URLs
  - `ALPHA`: https://ideas.parth.engineer
  - `BETA`: https://icloudems.tech
- `ServerType`: Type definition for server selection

#### New Service: ServerConfigService
- `getSelectedServer()`: Retrieves currently selected server (defaults to ALPHA)
- `setSelectedServer(server)`: Updates the selected server
- `getApiBaseUrl()`: Returns the URL of the currently selected server

#### Updated Services
- **DeviceService.registerDevice()**: Now uses dynamic API URL from `ServerConfigService`
- **ApiService.makeRequest()**: Now uses dynamic API URL from `ServerConfigService`

### 2. **app/settings.tsx** - New Settings Screen

A new screen that provides:
- Visual display of both server options (Alpha and Beta)
- Current server indication with "ACTIVE" badge
- Server switching functionality with confirmation dialog
- Automatic data refresh after switching servers
- Clear user feedback during the switching process
- Information about what happens when switching

**Features:**
- ✅ Shows current active server
- ✅ Displays server URLs
- ✅ Confirmation dialog before switching
- ✅ Automatic cache clearing
- ✅ Automatic data refresh from new server
- ✅ Loading states and error handling

### 3. **app/scanner.tsx** - Scanner Screen Updates

#### New Features
- Settings button (⚙️) in the header to access server settings
- Display of current server in the info section
- Automatic server config reload on refresh

#### UI Changes
- Header now has a flex layout with settings button on the right
- Info container shows which server is currently active
- Pull-to-refresh now also reloads server configuration

### 4. **app/_layout.tsx** - Navigation Update

Added new route for the settings screen:
```tsx
<Stack.Screen
  name="settings"
  options={{
    title: "Settings",
    presentation: "modal",
  }}
/>
```

## User Flow

### Accessing Settings
1. User opens the scanner screen
2. User taps the ⚙️ (settings) icon in the top-right corner
3. Settings screen opens as a modal

### Switching Servers
1. User selects a different server (Alpha or Beta)
2. Confirmation dialog appears with:
   - Server name
   - Server URL
   - Warning about data refresh
3. User confirms the switch
4. App performs the following actions:
   - Saves new server selection
   - Clears cached registration data
   - Downloads fresh data from new server
   - Shows success/error message
5. User is returned to scanner screen

### Visual Indicators
- **Active Server**: Green "ACTIVE" badge
- **Selected Server**: Blue border and light blue background
- **Checkmark**: Blue circle with checkmark for active server
- **Current Server Display**: Shown on scanner screen info section

## Storage Keys

New AsyncStorage key added:
- `api_server`: Stores the selected server ('ALPHA' or 'BETA')

## Error Handling

- If server switch succeeds but data download fails, user is warned but the server is still switched
- Network errors are caught and displayed to the user
- Settings screen shows loading states appropriately
- Back button allows user to cancel and return to scanner

## Testing Recommendations

1. **Server Switching:**
   - Switch from Alpha to Beta
   - Verify data refreshes
   - Switch back to Alpha
   - Verify data refreshes again

2. **Offline Behavior:**
   - Try switching servers while offline
   - Verify appropriate error messages

3. **Data Persistence:**
   - Switch servers
   - Close and reopen the app
   - Verify the selected server persists

4. **UI/UX:**
   - Check that active server is clearly indicated
   - Verify all loading states appear correctly
   - Test back button navigation

## Future Enhancements

Potential improvements:
- Add custom server URL option
- Show server health/status indicators
- Display server-specific statistics
- Add server switch history
- Implement background data sync when server changes

## Notes

- Default server is ALPHA if no selection has been made
- Scan history is preserved when switching servers
- Device configuration is not affected by server switching
- The app requires network connectivity to download data from the new server
