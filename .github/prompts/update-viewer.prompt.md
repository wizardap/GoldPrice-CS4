Please modify the viewer.html file to remove the chart functionality and only display the price table. The real-time price updates via Socket.io should still work correctly.

## Changes Required:

1. **Remove Chart UI Elements:**

   - Remove the entire chart card/section (the second card with "Biểu đồ giá" heading)
   - Remove chart controls including gold type selector, time range buttons, chart type toggle, etc.
   - Keep the price table and its styling

2. **Remove Chart JavaScript Code:**

   - Remove all chart-related functions (createLineChart, createCandlestickChart, updateChart, etc.)
   - Remove chart initialization code and event listeners for chart controls
   - Keep the price table update functionality intact
   - Keep Socket.io connection and real-time updates for the price table

3. **Clean Up Dependencies:**

   - Remove Chart.js and its plugin script tags
   - Remove any unused CSS styles related to charts

4. **Preserve Core Functionality:**
   - The price table should still update in real-time
   - The connection status indicator should still work
   - The UI should look clean and focused on the price table

The modified page should be a simpler version that only shows the real-time price table with proper styling and functionality.
