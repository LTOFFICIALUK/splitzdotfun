# SplitzFun - Solana Launchpad UI

A modern, dark-themed Solana launchpad with royalty routing, management delegation, ownership marketplace, and community-driven features.

## Product Concept

SplitzFun is a Solana launchpad that transforms how tokens are launched, managed, and monetized:

- **Royalty Router**: Route attention into royalties with automatic distribution
- **Management Delegation**: Assign managers to trusted community members
- **Ownership Marketplace**: List, auction, and trade token ownership
- **Community Nominations**: Holders suggest new royalty earners with evidence

## ✨ Features

### Current Implementation (UI Only)
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Dark Theme**: High-contrast, sleek design with mint/aqua accents
- **Component Library**: Reusable, accessible components
- **Mock Data**: Comprehensive placeholder data for all features
- **Stub Functionality**: All interactive elements show "coming soon" alerts

### Visual Design
- **Color Scheme**: Dark background with mint (`#6BFFB5`) and aqua (`#2DE2E6`) accents
- **Typography**: Inter for UI, JetBrains Mono for addresses/tickers
- **Animations**: Subtle hover effects and transitions (150-200ms)
- **Accessibility**: WCAG compliant with keyboard navigation and focus states

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom design system
- **Icons**: Lucide React
- **Fonts**: Inter, JetBrains Mono (Google Fonts)

### Project Structure
```
splitzdotfun/
├── app/
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx           # Root layout with metadata
│   └── page.tsx             # Home page component
├── components/
│   ├── layout/              # Layout components
│   │   ├── Header.tsx       # Navigation and wallet connection
│   │   └── Footer.tsx       # Footer with links and branding
│   ├── sections/            # Page sections
│   │   ├── Hero.tsx         # Hero section with CTAs
│   │   ├── ExplainerTiles.tsx # Feature explanation cards
│   │   ├── MyTokens.tsx     # User's token portfolio
│   │   ├── TrendingTokens.tsx # Horizontal scrolling tokens
│   │   ├── LeaderboardStrip.tsx # Top royalty earners
│   │   ├── TokenSpotlight.tsx # Featured token showcase
│   │   └── HowItWorks.tsx   # Step-by-step guide
│   └── ui/                  # Reusable UI components
│       ├── Button.tsx       # Button component with variants
│       ├── Modal.tsx        # Modal component with backdrop
│       ├── NavLink.tsx      # Navigation link component
│       ├── InfoCard.tsx     # Feature explanation card
│       └── TokenCard.tsx    # Token display card
├── types/
│   └── index.ts             # TypeScript interfaces
├── tailwind.config.js       # TailwindCSS configuration
├── next.config.js           # Next.js configuration
└── package.json             # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd splitzdotfun

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Design System

### Colors
```css
/* Primary Colors */
--primary-mint: #6BFFB5
--primary-aqua: #2DE2E6

/* Background Colors */
--background-dark: #0A0A0A
--background-card: #1A1A1A
--background-elevated: #2A2A2A

/* Text Colors */
--text-primary: #FFFFFF
--text-secondary: #A0A0A0
--text-muted: #666666
```

### Components
All components follow consistent patterns:
- **Props-driven**: All styling and behavior controlled via props
- **Accessible**: ARIA labels, keyboard navigation, focus states
- **Responsive**: Mobile-first design with breakpoint considerations
- **Type-safe**: Full TypeScript support with proper interfaces

## Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

## Customization

### Adding New Components
1. Create component in appropriate directory (`ui/` or `sections/`)
2. Add TypeScript interfaces to `types/index.ts`
3. Import and use in main page or other components

### Modifying Styles
- Global styles: `app/globals.css`
- Component styles: Use Tailwind classes in component files
- Design tokens: `tailwind.config.js`

## 🚧 Future Development

### Backend Integration
- Solana wallet connection (Phantom, Solflare, etc.)
- Bags API integration for token creation
- Real-time data fetching for token prices and stats
- Database for user data and token information

### Additional Features
- Token creation wizard
- Marketplace for token ownership
- Community voting system
- Analytics dashboard
- User profiles and portfolios

## 📄 License

This project is for demonstration purposes. All rights reserved.

## 🤝 Contributing

This is a UI-only implementation. For backend integration and feature development, please follow the established patterns and maintain accessibility standards.

---

**Note**: This is a front-end only implementation with mock data. All interactive features show stub alerts and are ready for backend integration.
