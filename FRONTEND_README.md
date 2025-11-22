# Frontend: IDE Selector & Prompt Builder UI

## Overview

This implementation provides a complete interactive UI for selecting IDEs and generating customized prompts. The application is built with Next.js 14, React 18, and styled with Tailwind CSS.

## Features Implemented

### 1. IDE Selector Component (`/components/IDESelector.tsx`)
- ✅ Grid/list view toggle for IDE display
- ✅ Search/filter functionality by name
- ✅ Shows IDE status (active, ingesting, error) with color coding
- ✅ Displays last-updated timestamp
- ✅ Click to select IDE with visual feedback
- ✅ Responsive design for mobile and desktop
- ✅ Loading states and error handling
- ✅ Mock data version for testing (`IDESelectorMock.tsx`)

### 2. Prompt Builder Component (`/components/PromptBuilder.tsx`)
- ✅ Task description textarea with rich text support
- ✅ Language dropdown (16+ programming languages)
- ✅ File upload/paste code snippets
- ✅ Advanced constraints panel (collapsible):
  - Max tokens control
  - Output format selection
  - Temperature slider
  - Include examples checkbox
- ✅ "Generate Prompt" button with loading state
- ✅ Form validation and user feedback

### 3. Prompt Display Component (`/components/PromptDisplay.tsx`)
- ✅ Shows generated prompt in appropriate format
- ✅ Syntax highlighting for JSON, Markdown, YAML, XML
- ✅ Validation status indicator (✓ valid / ✗ invalid)
- ✅ Validation details panel (errors/warnings)
- ✅ Generation attempts summary
- ✅ "Try Another Format" button
- ✅ Copy-to-clipboard functionality
- ✅ Save prompt button (for authenticated users)
- ✅ Prompt statistics (characters, words, lines)

### 4. Main Page (`/pages/prompt-generator.tsx`)
- ✅ Responsive layout with sidebar and main content
- ✅ Header with branding and theme toggle placeholder
- ✅ Mobile menu toggle button
- ✅ Empty state with helpful information
- ✅ Integration with all three components
- ✅ Loading states and error handling

### 5. API Integration
- ✅ `/api/ides` endpoint for fetching IDEs
- ✅ `/api/generatePrompt` integration
- ✅ Error handling and user feedback
- ✅ Mock data support for testing

## File Structure

```
├── components/
│   ├── IDESelector.tsx          # Main IDE selector component
│   ├── IDESelectorMock.tsx      # Mock version for testing
│   ├── PromptBuilder.tsx        # Prompt form builder
│   └── PromptDisplay.tsx        # Generated prompt display
├── pages/
│   ├── _app.tsx                 # Next.js app configuration
│   ├── _document.tsx            # HTML document setup
│   ├── globals.css              # Global styles with Tailwind
│   ├── index.tsx                # Home page (redirects to generator)
│   ├── prompt-generator.tsx      # Main prompt generator page
│   └── test.tsx                # Test page with mock data
├── pages/api/
│   └── ides.ts                 # API endpoint for fetching IDEs
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── package.json                # Updated dependencies
```

## Responsive Design

### Mobile (< 768px)
- Single column layout
- Collapsible sidebar (via floating action button)
- Touch-friendly buttons and inputs
- Optimized spacing and font sizes

### Desktop (≥ 768px)
- Two-column layout with fixed sidebar
- Hover states and transitions
- Grid view for IDE selector
- Full-width prompt builder and display

## Styling

### Design System
- **Colors**: Blue primary, gray neutrals, semantic colors (green/yellow/red for status)
- **Typography**: System font stack, consistent sizes and weights
- **Spacing**: Tailwind's spacing scale (4px base unit)
- **Borders**: Rounded corners, consistent border radius
- **Shadows**: Subtle shadows for depth and hover states

### Components
- **Cards**: White background, subtle borders, hover shadows
- **Buttons**: Consistent padding, rounded corners, color variants
- **Forms**: Labeled inputs, focus states, validation styling
- **Status Indicators**: Color-coded badges with clear meaning

## Testing

### Test Page (`/pages/test.tsx`)
- Uses mock IDESelector for independent testing
- Simulates API responses with realistic delays
- Tests component interactions and state management
- Accessible at `/test` during development

### Mock Data
- 6 sample IDEs with realistic data
- Simulated API responses
- Error state testing
- Loading state testing

## Usage

### Development
```bash
npm run dev          # Start development server
npm run type-check   # TypeScript type checking
npm run build        # Production build
```

### Testing
1. Visit `/test` for mock data testing
2. Visit `/prompt-generator` for full integration
3. Test responsive behavior at different viewport sizes
4. Test component interactions and state flows

### Production
```bash
npm run build        # Build for production
npm start           # Start production server
```

## Integration Points

### Existing Backend
- Uses existing `/api/generatePrompt` endpoint
- Compatible with existing `TemplateFileInput` types
- Integrates with existing database schema

### Future Enhancements
- Authentication integration
- Real IDE data from database
- Advanced prompt templates
- Prompt history and favorites
- Export functionality
- Theme switching implementation

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)
- Responsive design works across all viewports

## Performance

- Component-level state management
- Efficient re-renders with React hooks
- Optimized Tailwind CSS (purged in production)
- Lazy loading support ready
- SEO-friendly with proper meta tags

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Color contrast compliant

## Future Considerations

1. **Authentication**: Integrate with existing auth system
2. **Real Data**: Replace mock data with database calls
3. **State Management**: Consider Redux/Zustand for complex state
4. **Error Boundaries**: Add React error boundaries
5. **Testing**: Add Jest/React Testing Library tests
6. **Analytics**: Add user interaction tracking
7. **Internationalization**: Add i18n support
8. **PWA**: Add service worker for offline support