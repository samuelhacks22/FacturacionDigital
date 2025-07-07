# Sistema de Facturación Profesional

## Overview

This is a professional invoicing system designed for sanitary and electrical design projects. It's a client-side web application built with vanilla JavaScript that provides complete quotation management capabilities. The system uses local storage for data persistence and includes authentication, invoice generation, and export functionality.

## System Architecture

### Frontend Architecture
- **Pure HTML/CSS/JavaScript**: No frameworks, using vanilla JavaScript for maximum simplicity
- **Bootstrap 5.3.3**: For responsive UI components and styling
- **Font Awesome 6.4.0**: For icons and visual elements
- **Modular JavaScript**: Organized into separate modules for different functionalities

### Client-Side Components
- **Authentication System**: Simple login/logout with local storage
- **Invoice Management**: Create, edit, and manage invoices
- **Export System**: PDF and Excel export capabilities
- **Storage System**: Local storage-based data persistence

## Key Components

### 1. Authentication (`js/auth.js`)
- Simple username/password authentication
- Default users: admin/admin123, usuario/usuario123
- Session management via localStorage
- User interface updates based on authentication state

### 2. Invoice Management (`js/app.js`)
- Main application controller
- Form handling for invoice creation
- Service management (add/remove services)
- Real-time calculations and updates

### 3. Storage System (`js/storage.js`)
- Local storage wrapper for invoice data
- Unique ID generation for invoices
- CRUD operations for invoice management
- Data validation and error handling

### 4. Export System (`js/export.js`)
- PDF export using jsPDF library
- Excel export using xlsx library
- Professional formatting for exported documents
- Bulk export capabilities

### 5. User Interface
- Responsive design with Bootstrap
- Modal dialogs for authentication
- Professional invoice forms
- Real-time date display and calculations

## Data Flow

1. **User Authentication**: User logs in through modal form
2. **Invoice Creation**: User fills out invoice form with client and service details
3. **Service Management**: Dynamic addition/removal of services with real-time calculation
4. **Data Persistence**: Invoice data saved to localStorage
5. **Export Generation**: Convert invoice data to PDF/Excel formats
6. **Session Management**: User session maintained across page reloads

## External Dependencies

### CDN Libraries
- **Bootstrap 5.3.3**: UI framework and responsive design
- **Font Awesome 6.4.0**: Icons and visual elements
- **jsPDF 2.5.1**: PDF generation and export
- **jsPDF AutoTable 3.5.25**: Table formatting for PDF exports
- **xlsx 0.18.5**: Excel file generation and export
- **FileSaver.js 2.0.5**: File download functionality

### No Backend Dependencies
- All data stored locally in browser
- No server-side requirements
- No database connections needed

## Deployment Strategy

### Static File Hosting
- Can be deployed on any static hosting platform
- No server-side processing required
- All functionality runs in the browser
- Compatible with GitHub Pages, Netlify, Vercel, etc.

### File Structure
```
├── index.html          # Main application entry point
├── css/
│   └── styles.css      # Custom styling and theme
├── js/
│   ├── app.js          # Main application logic
│   ├── auth.js         # Authentication system
│   ├── storage.js      # Local storage management
│   └── export.js       # Export functionality
└── attached_assets/    # Additional resources
```

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 07, 2025. Initial setup