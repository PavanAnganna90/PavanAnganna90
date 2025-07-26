# Dashboard Builder Testing Guide

## 🎯 Where to Test the Custom Dashboard Builder

### Frontend UI Testing

1. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Access the Dashboard Builder**
   - Open your browser to: `http://localhost:3000`
   - Click on **"Dashboard Builder"** in the navigation menu
   - Or directly visit: `http://localhost:3000/dashboard-builder`

### Backend API Testing

1. **Start the Backend Test Server**
   ```bash
   cd backend
   python main_dashboard_test.py
   ```

2. **Access API Documentation**
   - API Docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
   - Health Check: `http://localhost:8000/health`

## 🧪 Testing Features

### Dashboard Builder UI Features:

1. **Dashboard Management**
   - ✅ Create new dashboards
   - ✅ Edit existing dashboards  
   - ✅ Duplicate dashboards
   - ✅ Delete dashboards
   - ✅ Search and filter dashboards

2. **Widget Library**
   - ✅ Metric Cards (CPU, Memory, etc.)
   - ✅ Charts (Line, Bar, Pie, Gauge)
   - ✅ Alert Lists
   - ✅ Service Status widgets
   - ✅ Timeline widgets

3. **Drag & Drop Interface**
   - ✅ Drag widgets from library
   - ✅ Reposition widgets on canvas
   - ✅ Visual feedback during drag operations
   - ✅ Grid-based layout system

4. **Widget Configuration**
   - ✅ Edit widget titles
   - ✅ Configure data sources
   - ✅ Adjust refresh intervals
   - ✅ Customize widget-specific settings

5. **Dashboard Templates**
   - ✅ Infrastructure Overview template
   - ✅ Application Performance template
   - ✅ Security Dashboard template

### Backend API Features:

1. **Dashboard CRUD Operations**
   - `POST /dashboards` - Create dashboard
   - `GET /dashboards` - List dashboards
   - `GET /dashboards/{id}` - Get dashboard
   - `PUT /dashboards/{id}` - Update dashboard
   - `DELETE /dashboards/{id}` - Delete dashboard

2. **Dashboard Operations**
   - `POST /dashboards/{id}/duplicate` - Duplicate dashboard
   - `POST /dashboards/{id}/export` - Export dashboard

3. **Templates & Widgets**
   - `GET /dashboards/templates/list` - List templates
   - `GET /dashboards/widgets/types` - Get widget types

## 🚀 Quick Test Scenarios

### Scenario 1: Create Your First Dashboard
1. Navigate to Dashboard Builder
2. Click "Create Dashboard"
3. Add a few widgets from the library
4. Configure widget settings
5. Save the dashboard

### Scenario 2: Use a Template
1. On the Dashboard Builder page
2. Click on one of the template cards
3. Customize the pre-built dashboard
4. Save with a new name

### Scenario 3: Widget Management
1. Create a dashboard
2. Add different types of widgets
3. Click on a widget to configure it
4. Use the settings panel to modify:
   - Title
   - Data source
   - Refresh interval
   - Widget-specific options

### Scenario 4: Dashboard Operations
1. Create multiple dashboards
2. Test search functionality
3. Duplicate a dashboard
4. Delete a dashboard
5. Toggle between edit and preview modes

## 📊 Widget Types Available

1. **Metric Card** - Single value with trend indicator
2. **Line Chart** - Time series data visualization
3. **Bar Chart** - Comparative data display
4. **Pie Chart** - Proportional data representation
5. **Gauge** - Speedometer-style metrics
6. **Alert List** - Recent alerts and notifications
7. **Service Status** - Service health overview
8. **Timeline** - Chronological events display

## 🔧 Customization Options

### Data Sources:
- Metrics
- Alerts  
- Services
- Analytics

### Refresh Intervals:
- 30 seconds
- 1 minute
- 5 minutes
- 15 minutes
- Custom intervals

### Layout Options:
- Grid-based layout
- Responsive design
- Column spanning
- Drag and drop positioning

## 🎨 Themes & Styling

- Light theme (default)
- Dark theme support
- Custom color schemes
- Responsive design for mobile

## 📱 Mobile Testing

Test the dashboard builder on different screen sizes:
- Desktop (1920x1080+)
- Tablet (768x1024)
- Mobile (375x667)

## 🔍 Debugging Tips

1. **Check Browser Console** for JavaScript errors
2. **Network Tab** to monitor API calls
3. **React DevTools** for component inspection
4. **Backend Logs** for API debugging

## 🎯 Success Criteria

The Dashboard Builder is working correctly if you can:
- ✅ Navigate to the dashboard builder page
- ✅ See the widget library on the left
- ✅ Add widgets to the canvas
- ✅ Configure widget settings
- ✅ Save and load dashboards
- ✅ Use template dashboards
- ✅ Perform all CRUD operations

## 🐛 Common Issues & Solutions

1. **Widgets not dragging**: Check browser compatibility
2. **API calls failing**: Ensure backend server is running
3. **Styling issues**: Verify Tailwind CSS is loaded
4. **TypeScript errors**: Check component prop types

## 🚧 Future Enhancements

- Advanced grid layouts
- Custom widget development
- Real-time data integration
- Dashboard sharing features
- Export to PDF/PNG
- Advanced permissions