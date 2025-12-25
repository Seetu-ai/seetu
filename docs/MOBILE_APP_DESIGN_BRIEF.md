# Seetu Mobile App - UX/UI Design Brief

## Document Info
- **Version**: 1.0
- **Date**: December 2024
- **Audience**: UX/UI Design Team
- **Platform**: iOS + Android (React Native)

---

## 1. Product Overview

### 1.1 What is Seetu?
Seetu is an AI-powered photo studio for African entrepreneurs. Users upload product photos and our AI generates professional marketing images with custom backgrounds, models, and styling - all aligned with their brand identity.

### 1.2 App Tagline
**"Studio Photo IA pour l'Afrique"**

### 1.3 Primary Market
- Senegal (launch market)
- French-speaking West Africa
- Small business owners, e-commerce sellers, Instagram shops

### 1.4 Key Value Propositions
1. **Professional photos without a studio** - Generate catalog-quality images from phone photos
2. **African-first** - Real Senegalese locations, African models, local payment methods
3. **Brand consistency** - AI learns your visual identity and maintains it across all images
4. **Affordable** - Pay per image, no subscription required

---

## 2. User Personas

### 2.1 Primary: Fatou - The Instagram Seller
- **Age**: 28
- **Location**: Dakar, Senegal
- **Business**: Sells handmade jewelry on Instagram
- **Tech comfort**: High (uses iPhone daily, Instagram expert)
- **Pain points**:
  - Can't afford professional photography
  - Takes product photos at home with bad lighting
  - Wants her feed to look cohesive and professional
- **Goals**:
  - Make her Instagram look like a real boutique
  - Show jewelry on models without hiring them
  - Post consistently with professional-looking content

### 2.2 Secondary: Moussa - The E-commerce Entrepreneur
- **Age**: 35
- **Location**: Saint-Louis, Senegal
- **Business**: Online clothing store
- **Tech comfort**: Medium (uses Android, WhatsApp business)
- **Pain points**:
  - Needs product photos for multiple e-commerce platforms
  - Competitors have better visuals
  - Inconsistent photo quality hurts sales
- **Goals**:
  - Professional product catalog
  - Ghost mannequin / on-model shots
  - Batch process multiple products

### 2.3 Tertiary: Awa - The Location Owner (Creator)
- **Age**: 42
- **Location**: Saly, Senegal
- **Business**: Owns a boutique hotel
- **Tech comfort**: Medium
- **Pain points**:
  - Hotel photos not being used to their potential
  - Wants passive income from her beautiful spaces
- **Goals**:
  - List her location on the marketplace
  - Earn money when others use her spaces as backgrounds
  - Promote her hotel indirectly

---

## 3. App Structure

### 3.1 Navigation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tab Bar (Bottom)                      │
├─────────────┬─────────────┬─────────────┬──────────────┤
│   Accueil   │   Studio    │   Galerie   │   Profil     │
│   (Home)    │  (Create)   │  (Gallery)  │  (Profile)   │
└─────────────┴─────────────┴─────────────┴──────────────┘
```

### 3.2 Screen Hierarchy

```
App
├── Auth Flow (unauthenticated)
│   ├── Welcome / Onboarding (3 slides)
│   ├── Login
│   ├── Sign Up
│   └── Forgot Password
│
├── Main App (authenticated)
│   ├── Tab: Accueil (Home)
│   │   ├── Dashboard
│   │   └── Notifications
│   │
│   ├── Tab: Studio
│   │   ├── Step 1: Product Selection
│   │   │   ├── Camera Capture
│   │   │   ├── Gallery Pick
│   │   │   └── Recent Products
│   │   ├── Step 2: Presentation Type
│   │   │   ├── Product Only
│   │   │   ├── On Model (+ Model Browser)
│   │   │   └── Ghost Mannequin
│   │   ├── Step 3: Scene/Background
│   │   │   ├── Real Places (Google Street View)
│   │   │   ├── Marketplace Locations
│   │   │   ├── Studio Backgrounds
│   │   │   └── AI Creative
│   │   ├── Step 4: Generate
│   │   │   ├── Style Notes Input
│   │   │   ├── Cost Summary
│   │   │   └── Generate Button
│   │   └── Result Screen
│   │       ├── Image Preview
│   │       ├── Download
│   │       ├── Share
│   │       └── Iterate
│   │
│   ├── Tab: Galerie (Gallery)
│   │   ├── All Generations (Grid)
│   │   ├── Image Detail
│   │   └── Filters/Search
│   │
│   └── Tab: Profil (Profile)
│       ├── Account Settings
│       ├── My Brand
│       ├── Credits & Purchase
│       ├── Creator Dashboard (if creator)
│       │   ├── My Assets
│       │   ├── Earnings
│       │   └── New Asset Flow
│       ├── Help & Support
│       └── Legal
│
└── Modals / Overlays
    ├── Model Browser
    ├── Location Browser
    ├── Credit Purchase
    ├── Image Actions (Share/Download)
    └── Generation Progress
```

---

## 4. User Flows

### 4.1 Flow 1: First-Time User Onboarding

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Welcome     │    │  Onboard 1   │    │  Onboard 2   │    │  Onboard 3   │
│  Screen      │───▶│  "Prenez"    │───▶│  "L'IA"      │───▶│  "Partagez"  │
│              │    │  (Take)      │    │  (AI Magic)  │    │  (Share)     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                    │
                    ┌──────────────┐    ┌──────────────┐           │
                    │   Sign Up    │◀───│  Login or    │◀──────────┘
                    │   Form       │    │  Sign Up     │
                    └──────┬───────┘    └──────────────┘
                           │
                    ┌──────▼───────┐    ┌──────────────┐
                    │  Business    │───▶│   Home       │
                    │  Type Select │    │   Dashboard  │
                    └──────────────┘    └──────────────┘
```

**Onboarding Slides Content**:
1. **"Prenez vos produits en photo"** - Show phone camera capturing a product
2. **"L'IA fait la magie"** - Split screen: before (amateur) → after (pro)
3. **"Partagez partout"** - Show Instagram, WhatsApp, e-commerce icons

### 4.2 Flow 2: Generate First Image (Happy Path)

```
┌──────────────┐
│    Home      │
│  "Nouveau"   │
│   Button     │
└──────┬───────┘
       │
┌──────▼───────┐    ┌──────────────┐
│  Step 1:     │    │   Camera     │
│  Product     │───▶│   or         │───┐
│  Selection   │    │   Gallery    │   │
└──────────────┘    └──────────────┘   │
       ▲                               │
       │    ┌──────────────────────────┘
       │    │
┌──────┴────▼──┐
│  Product     │
│  Preview +   │
│  Analysis    │
│  (AI names   │
│   product)   │
└──────┬───────┘
       │
┌──────▼───────┐    ┌──────────────┐    ┌──────────────┐
│  Step 2:     │    │  Model       │    │  Selected    │
│  Presentation│───▶│  Browser     │───▶│  Model +     │
│  Type        │    │  (if on_model│    │  Continue    │
└──────────────┘    │  selected)   │    └──────┬───────┘
                    └──────────────┘           │
       ┌───────────────────────────────────────┘
       │
┌──────▼───────┐    ┌──────────────┐
│  Step 3:     │    │  Location    │
│  Scene       │───▶│  Search /    │
│  Selection   │    │  Browse      │
└──────────────┘    └──────┬───────┘
                           │
       ┌───────────────────┘
       │
┌──────▼───────┐
│  Step 4:     │
│  Style Notes │
│  + Cost      │
│  + Generate  │
└──────┬───────┘
       │
┌──────▼───────┐    (Loading: 15-30s)
│  Generating  │
│  Animation   │
└──────┬───────┘
       │
┌──────▼───────┐    ┌──────────────┐    ┌──────────────┐
│   Result     │───▶│   Share /    │───▶│   Gallery    │
│   Screen     │    │   Download   │    │   (saved)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 4.3 Flow 3: Purchase Credits

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Trigger:    │    │   Credit     │    │   Select     │
│  Low credits │───▶│   Packs      │───▶│   Pack       │
│  or Profile  │    │   Screen     │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
┌──────────────┐    ┌──────────────┐           │
│   Credits    │    │   NabooPay   │◀──────────┘
│   Updated    │◀───│   WebView    │
│   Toast      │    │   (Wave/OM)  │
└──────────────┘    └──────────────┘
```

### 4.4 Flow 4: Creator Asset Submission

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Profile     │    │   Become     │    │  Creator     │
│  → Creator   │───▶│   Creator    │───▶│  Dashboard   │
│     Tab      │    │   Form       │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
       ┌───────────────────────────────────────┘
       │
┌──────▼───────┐    ┌──────────────┐    ┌──────────────┐
│  New Asset   │    │  Asset Info  │    │  Upload      │
│  Button      │───▶│  (Name, Type │───▶│  Images      │
│              │    │   Category)  │    │  (1-5)       │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
┌──────────────┐    ┌──────────────┐           │
│  Asset in    │    │   Review     │◀──────────┘
│  "Pending"   │◀───│   Summary    │
│  Status      │    │   + Submit   │
└──────────────┘    └──────────────┘
```

---

## 5. Screen Specifications

### 5.1 Welcome / Splash Screen

**Purpose**: Brand introduction, set the tone

**Elements**:
- Seetu logo (terracotta brand mark)
- Tagline: "Studio Photo IA pour l'Afrique"
- Background: Subtle gradient or pattern
- Loading indicator (if checking auth)

**Behavior**:
- Auto-advance after 2s if user is logged in → Home
- Show "Commencer" button if new user

---

### 5.2 Onboarding Carousel (3 screens)

**Layout**: Full-screen illustration (60%) + Text (25%) + Dots/Button (15%)

**Screen 1: "Prenez"**
- Illustration: Hand holding phone, photographing a dress
- Title: "Prenez vos produits en photo"
- Subtitle: "Utilisez simplement votre téléphone"

**Screen 2: "Transformez"**
- Illustration: Before/After split - amateur photo → professional result
- Title: "L'IA transforme vos images"
- Subtitle: "Ajoutez décors, mannequins et style de marque"

**Screen 3: "Partagez"**
- Illustration: Phone with Instagram, WhatsApp, Jumia icons
- Title: "Partagez partout"
- Subtitle: "Des visuels pro pour toutes vos plateformes"

**Navigation**:
- Swipe left/right
- Dot indicators
- "Passer" (Skip) link top-right
- "Suivant" / "Commencer" button bottom

---

### 5.3 Login Screen

**Elements**:
- Logo (small, top)
- "Connexion" heading
- Email input field
- Password input field (with show/hide toggle)
- "Mot de passe oublié?" link
- "Se connecter" primary button
- Divider: "ou"
- "Créer un compte" secondary button

**Validation**:
- Email format validation
- Password minimum 6 characters
- Error messages inline below fields

**States**:
- Default
- Loading (button spinner)
- Error (shake animation + red border)

---

### 5.4 Sign Up Screen

**Elements**:
- Logo (small, top)
- "Créer un compte" heading
- Name input field
- Email input field
- Password input field
- Confirm password field
- Business type selector (Fashion / Food / Beauty / Real Estate / Other)
- Terms checkbox: "J'accepte les conditions d'utilisation"
- "S'inscrire" primary button
- "Déjà un compte? Se connecter" link

**Business Type Selector**:
- Horizontal scrollable chips or grid of icons
- Fashion (shirt icon), Food (utensils), Beauty (lipstick), Real Estate (house), Other (dots)

---

### 5.5 Home Dashboard

**Layout**: Scrollable vertical list

**Section 1: Header**
- User avatar (left)
- "Bonjour, [Name]" greeting
- Credits badge: "3 crédits" (right)
- Notification bell (right, with dot if unread)

**Section 2: Quick Action Card**
- Large CTA card with gradient background
- "Créer une image" button
- Subtitle: "Générez des photos pro en 4 étapes"

**Section 3: Recent Generations**
- "Récentes" section header
- Horizontal scroll of last 5-10 generated images
- Each image: Square thumbnail, tap to view
- "Voir tout →" link to Gallery

**Section 4: Credits Card**
- Current balance prominently displayed
- "Acheter des crédits" button
- Visual indicator (progress bar or pie chart)

**Section 5: Quick Tips (optional)**
- Carousel of tips/tutorials
- "Comment prendre une bonne photo produit"
- "Utilisez le style de marque"

---

### 5.6 Studio - Step 1: Product Selection

**Layout**: Full screen with bottom action area

**Header**:
- Back arrow (to Home)
- "Étape 1/4" indicator
- "Produit" title

**Main Content**:

*If no product selected:*
- Large upload area (dashed border)
- Camera icon + "Prendre une photo"
- Gallery icon + "Choisir une image"
- Recent products grid (if any exist)

*If product selected:*
- Product image preview (large, square)
- AI analysis badge: "Robe en wax, tons bleus"
- "Changer" button (top-right of image)
- Product name input (editable)
- Optional note field: "Précisions sur le produit..."

**Bottom Action**:
- "Continuer" button (disabled until product selected)

**Camera Subscreen**:
- Full camera viewfinder
- Capture button (large, center)
- Flip camera button
- Gallery shortcut button
- Tips overlay: "Centrez le produit sur fond uni"

---

### 5.7 Studio - Step 2: Presentation Type

**Layout**: Selection grid

**Header**:
- Back arrow
- "Étape 2/4"
- "Présentation" title

**Options (3 cards)**:

1. **Produit seul**
   - Icon: Product on pedestal
   - Label: "Produit seul"
   - Description: "Photo packshot classique"

2. **Sur mannequin**
   - Icon: Person silhouette with product
   - Label: "Sur mannequin"
   - Description: "Porté par un modèle IA"
   - Badge: "Populaire"

3. **Flat lay**
   - Icon: Flat lay arrangement
   - Label: "Flat lay / Ghost"
   - Description: "Vue à plat, mannequin invisible"

**If "Sur mannequin" selected**:
- Model browser slides up (half-sheet modal)
- Grid of model thumbnails
- Filter chips: "Femme", "Homme", "Tout"
- Each model card shows:
  - Thumbnail
  - Name
  - Price badge: "+0.5 crédit"
  - "Sélectionner" button

**Bottom Action**:
- "Continuer" button

---

### 5.8 Studio - Step 3: Scene Selection

**Layout**: Tab-based selection

**Header**:
- Back arrow
- "Étape 3/4"
- "Décor" title

**Tabs (horizontal scroll)**:
- "Lieux réels" (Real places)
- "Studio" (Studio backgrounds)
- "IA Créatif" (AI generated)

**Tab: Lieux réels**
- Search bar: "Rechercher un lieu à Dakar..."
- Recent/Popular locations grid
- Google Street View integration
- Marketplace locations with creator badges
- Each location card:
  - Thumbnail
  - Name: "Corniche, Dakar"
  - Creator badge (if marketplace): "Photo par @amadou"
  - Price: "+0.5 crédit" (if marketplace)

**Tab: Studio**
- Grid of studio background options
- Categories: "Blanc", "Coloré", "Texturé", "Lifestyle"
- Simple tap to select

**Tab: IA Créatif**
- Text input: "Décrivez le décor souhaité..."
- Suggestions chips: "Plage tropicale", "Bureau moderne", "Marché africain"
- Preview of AI-generated scenes (if any saved)

**Bottom Action**:
- "Continuer" button
- Selected scene preview (small thumbnail)

---

### 5.9 Studio - Step 4: Generate

**Layout**: Summary + Action

**Header**:
- Back arrow
- "Étape 4/4"
- "Générer" title

**Summary Section**:
- Recap card showing:
  - Product thumbnail + name
  - Presentation type icon + label
  - Scene thumbnail + name
  - Model (if selected)

**Style Notes Section**:
- "Instructions de style (optionnel)"
- Text input with placeholder: "Ex: Lumière dorée, style magazine..."
- Moodboard upload button (optional): "Ajouter une référence"

**Cost Breakdown**:
- Card with itemized costs:
  - "Génération d'image: 1 crédit"
  - "Mannequin (Aissatou): +0.5 crédit" (if applicable)
  - "Lieu (Corniche): +0.5 crédit" (if applicable)
  - Divider
  - **"Total: 2 crédits"** (bold)

**Credits Warning** (if insufficient):
- Yellow warning card
- "Crédits insuffisants"
- "Acheter des crédits" button

**Generate Button**:
- Large, prominent button
- "GÉNÉRER L'IMAGE"
- Gradient background (brand colors)
- Icon: Magic wand

---

### 5.10 Generation Loading Screen

**Layout**: Full screen overlay

**Elements**:
- Animated illustration (product transforming)
- Progress indicator (circular or bar)
- Status text cycling:
  - "Analyse du produit..."
  - "Application du style..."
  - "Création de l'image..."
  - "Touches finales..."
- Estimated time: "~20 secondes"
- Cancel button (subtle, bottom)

**Animation Ideas**:
- Product photo morphing into professional shot
- Paint brush strokes revealing image
- Sparkle/magic particle effects

---

### 5.11 Result Screen

**Layout**: Image focus with action bar

**Image Display**:
- Full-width generated image
- Pinch to zoom
- Tap to toggle fullscreen

**Caption Section** (if available):
- Generated Instagram caption
- Copy button
- "Régénérer caption" option

**Action Bar**:
- "Télécharger" (Download) - Primary
- "Partager" (Share) - Secondary
- "Instagram" - Quick share icon
- "WhatsApp" - Quick share icon

**Iteration Section**:
- "Pas satisfait?"
- Text input: "Que voudriez-vous changer?"
- "Régénérer" button (uses 1 more credit)

**Navigation**:
- "Nouvelle image" → Back to Step 1
- "Galerie" → Go to Gallery tab

---

### 5.12 Gallery Screen

**Layout**: Grid with filters

**Header**:
- "Ma Galerie" title
- Filter icon (opens filter sheet)
- Search icon

**Filter Options** (bottom sheet):
- Date range: "Cette semaine", "Ce mois", "Tout"
- Type: "Studio", "Shoots", "Tout"
- Brand selector (if multiple brands)

**Grid**:
- 3-column masonry grid
- Lazy loading with skeleton placeholders
- Pull to refresh

**Empty State**:
- Illustration of empty gallery
- "Aucune image"
- "Créez votre première image" button

**Image Detail** (on tap):
- Full screen image view
- Action buttons: Download, Share, Delete
- Metadata: Date, Product, Credits used
- "Créer une variante" button

---

### 5.13 Profile Screen

**Layout**: Settings list with header

**Header Section**:
- User avatar (tap to change)
- User name
- Email
- "Modifier" button

**Credits Section**:
- Current balance card
- "Acheter des crédits" button
- "Historique" link

**Settings List**:
- Ma marque (Brand settings)
- Mode créateur (Creator mode toggle)
- Notifications
- Langue (Language)
- Aide & Support
- À propos
- Conditions d'utilisation
- Politique de confidentialité
- Se déconnecter

**Creator Section** (if creator mode enabled):
- "Tableau de bord créateur" entry point
- Quick stats: X assets, Y uses, Z FCFA earned

---

### 5.14 Credit Purchase Screen

**Layout**: Pack selection

**Header**:
- "Acheter des crédits"
- Current balance display

**Pack Cards** (vertical list):
Each card contains:
- Pack name
- Credit amount (large)
- Price in FCFA
- Price per credit
- Savings badge (if applicable): "Économisez 30%"
- "Best value" badge on Business pack

**Pack Details**:
```
┌────────────────────────────────────┐
│  PRO                    Populaire  │
│  20 crédits                        │
│  8 000 FCFA                        │
│  400 FCFA/crédit · Économisez 20%  │
│                      [Acheter]     │
└────────────────────────────────────┘
```

**Payment Methods**:
- Icons: Wave, Orange Money, Visa
- Text: "Paiement sécurisé via NabooPay"

**After Selection**:
- Opens WebView with NabooPay checkout
- Returns to app with success/error toast

---

### 5.15 Creator Dashboard

**Layout**: Overview + Actions

**Stats Cards Row**:
- Total earnings: "45 000 FCFA"
- This month: "12 000 FCFA"
- Total uses: "89"

**My Assets Section**:
- Horizontal scroll of asset cards
- Status badges: "Actif", "En révision", "Brouillon"
- "+ Nouvel asset" card at end

**Asset Card**:
```
┌──────────────────────┐
│ [Thumbnail]          │
│ Boutique Hotel Saly  │
│ 🟢 Actif · 23 uses   │
└──────────────────────┘
```

**Earnings Section**:
- "Voir les revenus" button
- Recent payouts list
- Pending balance

**New Asset Button**:
- Floating action button (bottom right)
- "+ Nouvel asset"

---

### 5.16 New Asset Flow (Creator)

**Step 1: Asset Type**
- "Quel type d'asset?"
- Options:
  - "Lieu / Location" (building icon)
  - "Modèle" (person icon) - Coming soon
  - "Style photo" (camera icon) - Coming soon

**Step 2: Information**
- Title input
- Description textarea
- Location fields (if location type):
  - City dropdown
  - Category: "Hôtel", "Restaurant", "Plage", "Bureau"...
- Tags input (chips)

**Step 3: Images**
- "Ajoutez 1 à 5 photos"
- Grid upload area
- Image requirements listed:
  - "Minimum 1000x1000 pixels"
  - "Bonne qualité, bien éclairé"
  - "Sans personnes visibles"

**Step 4: Review & Submit**
- Preview of listing
- Terms acceptance checkbox
- "Soumettre pour révision" button
- Info: "Révision sous 24-48h"

---

## 6. Component Library Needs

### 6.1 Buttons
- Primary (filled, gradient)
- Secondary (outlined)
- Tertiary (text only)
- Icon button (circular)
- FAB (floating action)
- Loading state (spinner)
- Disabled state

### 6.2 Inputs
- Text input (with label, error state)
- Password input (with show/hide)
- Textarea
- Search input
- Chip/Tag input

### 6.3 Cards
- Product card (thumbnail + info)
- Asset card (thumbnail + status)
- Pack card (pricing)
- Summary card (recap)
- Stat card (number + label)

### 6.4 Navigation
- Bottom tab bar
- Header with back button
- Step indicator (1/4 style)
- Breadcrumbs (optional)

### 6.5 Feedback
- Toast notifications
- Loading spinners
- Skeleton loaders
- Empty states
- Error states
- Success animations

### 6.6 Modals & Sheets
- Bottom sheet (half, full)
- Alert dialog
- Confirmation dialog
- Image viewer (full screen, zoomable)

### 6.7 Lists
- Simple list item
- List item with thumbnail
- List item with toggle
- Horizontal scroll list

### 6.8 Selection
- Radio button group
- Checkbox
- Selection card (tap to select)
- Filter chips

---

## 7. Design System Guidelines

### 7.1 Colors

**Primary Palette**:
- Terracotta (Brand): `#C45C3E` - Primary actions, logo
- Terracotta Dark: `#A04830` - Pressed states
- Terracotta Light: `#E8A090` - Backgrounds

**Secondary Palette**:
- Violet: `#7C3AED` - Accent, CTAs
- Indigo: `#4F46E5` - Gradient partner

**Neutrals**:
- Slate 900: `#0F172A` - Primary text
- Slate 600: `#475569` - Secondary text
- Slate 400: `#94A3B8` - Placeholder text
- Slate 200: `#E2E8F0` - Borders
- Slate 50: `#F8FAFC` - Background

**Semantic**:
- Success: `#22C55E`
- Warning: `#F59E0B`
- Error: `#EF4444`

### 7.2 Typography

**Font Family**: Inter (or system font)

**Scale**:
- Display: 32px / Bold - Screen titles
- H1: 24px / Semibold - Section headers
- H2: 20px / Semibold - Card titles
- Body: 16px / Regular - Body text
- Body Small: 14px / Regular - Secondary text
- Caption: 12px / Medium - Labels, badges

### 7.3 Spacing

Use 4px base unit:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### 7.4 Border Radius

- Small: 4px (chips, badges)
- Medium: 8px (buttons, inputs)
- Large: 12px (cards)
- XL: 16px (modals)
- Full: 9999px (avatars, FAB)

### 7.5 Shadows

- sm: `0 1px 2px rgba(0,0,0,0.05)`
- md: `0 4px 6px rgba(0,0,0,0.07)`
- lg: `0 10px 15px rgba(0,0,0,0.1)`

---

## 8. Interaction Guidelines

### 8.1 Gestures
- **Tap**: Select, navigate
- **Long press**: Context menu (image actions)
- **Swipe**: Navigate carousel, dismiss sheets
- **Pinch**: Zoom images
- **Pull down**: Refresh

### 8.2 Transitions
- Screen push: 300ms ease-out
- Modal slide up: 250ms ease-out
- Fade: 200ms ease
- Scale (buttons): 100ms

### 8.3 Loading States
- Skeleton screens for content loading
- Inline spinners for actions
- Full-screen overlay for generation
- Progress bar for multi-step processes

### 8.4 Haptic Feedback
- Light: Button taps
- Medium: Success actions
- Heavy: Errors, warnings

---

## 9. Accessibility Requirements

### 9.1 Touch Targets
- Minimum 44x44pt for all interactive elements

### 9.2 Color Contrast
- 4.5:1 minimum for normal text
- 3:1 minimum for large text

### 9.3 Text
- Support dynamic type scaling
- Maximum 80 characters per line
- Clear hierarchy with size/weight

### 9.4 Screen Reader
- All images need alt text
- Interactive elements need labels
- Announce state changes

### 9.5 Motion
- Respect "reduce motion" preference
- Provide alternatives to animations

---

## 10. Edge Cases & Error States

### 10.1 Empty States
- No generations yet
- No credits
- No products
- No assets (creator)
- Search no results

### 10.2 Error States
- Network error (offline)
- Upload failed
- Generation failed
- Payment failed
- Session expired

### 10.3 Loading States
- Initial app load
- Image upload progress
- Generation progress (with stages)
- Payment processing

### 10.4 Permissions
- Camera permission denied
- Photo library permission denied
- Notification permission prompt

---

## 11. Localization

### 11.1 Languages
- **Primary**: French (fr)
- **Future**: English (en), Wolof (wo)

### 11.2 RTL Support
- Not required for initial launch

### 11.3 Currency
- Display: FCFA (Franc CFA)
- Format: "8 000 FCFA" (space as thousand separator)

### 11.4 Date/Time
- Format: "25 déc. 2024"
- Relative: "il y a 2 heures"

---

## 12. Deliverables Checklist

### Design System
- [ ] Color palette with tokens
- [ ] Typography scale
- [ ] Spacing scale
- [ ] Icon set (outline style)
- [ ] Component library (Figma)

### Screens (High Fidelity)
- [ ] Splash / Welcome
- [ ] Onboarding (3)
- [ ] Login
- [ ] Sign Up
- [ ] Home Dashboard
- [ ] Studio Step 1-4
- [ ] Generation Loading
- [ ] Result Screen
- [ ] Gallery Grid
- [ ] Gallery Detail
- [ ] Profile
- [ ] Credits Purchase
- [ ] Creator Dashboard
- [ ] New Asset Flow

### Prototypes
- [ ] Onboarding flow
- [ ] Generation flow (happy path)
- [ ] Purchase flow

### Assets
- [ ] App icon (1024x1024)
- [ ] Splash screen
- [ ] Onboarding illustrations
- [ ] Empty state illustrations
- [ ] Error state illustrations
- [ ] Store screenshots (iOS + Android)
- [ ] Feature graphic (Android)

---

## 13. Questions for Design Team

1. **Illustration style**: Do we want flat, isometric, or 3D illustrations for onboarding and empty states?

2. **Dark mode**: Is dark mode required for V1, or can it be a future addition?

3. **Animations**: Should we invest in custom Lottie animations for loading states, or use simple spinners?

4. **Micro-interactions**: What level of delight/polish are we targeting? (e.g., confetti on first generation?)

5. **Model browser**: Carousel vs. grid for model selection? How prominent should creator attribution be?

---

## 14. Reference Apps

For inspiration on similar flows:

- **Canva Mobile**: Template selection, editing flow
- **VSCO**: Photo editing, filters
- **Wave Senegal**: Payment flow, local UX patterns
- **Jumia**: E-commerce product display
- **Instagram**: Image gallery, sharing

---

*Document prepared for the Seetu UX/UI Design Team. For questions, contact the Product team.*
