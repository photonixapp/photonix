# UI/UX Guidelines

This document provides guidelines for the user interface (UI) and user experience (UX) of the Photonix application. The goal is to create a consistent, intuitive, and visually cohesive experience for the user.

## 1. Component Library: Chakra UI

*   **Primary Rule**: All new UI components and views **must** be built using the existing **Chakra UI** component library.
*   **Rationale**: Chakra UI provides a set of accessible, themeable, and composable React components that form the visual foundation of the application. Using it consistently prevents visual fragmentation and speeds up development.
*   **Action**: Before creating a new custom component, always check if a suitable component already exists within Chakra UI. If a new component is necessary, it should be built using Chakra UI's primitive components (e.g., `Box`, `Stack`, `PseudoBox`).

## 2. Core UX Pattern: Modal on Browse View

*   **The Pattern**: The primary user experience is centered around the main **Browse View** (`/`). Most secondary actions, detail views, and settings pages should be presented as **modals** that open on top of this view. The `react-router-modal` library is used to implement this.
*   **When to Use**: This pattern should be used for:
    *   Viewing the details of an item from the main grid (e.g., `PhotoDetail`).
    *   Editing settings (`Settings`, `Account`).
    *   Forms for creating or editing data (`AddTag`, `CreateAlbum`).
*   **When Not to Use**: Full-page navigation should be reserved for major shifts in context that would make the underlying Browse View irrelevant (e.g., the initial `Login` page).
*   **Rationale**: This pattern keeps the user's main context (their photo collection) visible in the background, creating a focused and less disorienting user experience.

## 3. Layout and Responsiveness

*   **Consistency**: New views should follow the existing layout patterns (e.g., header, content area).
*   **Responsiveness**: All new UI work must be responsive and functional on both desktop and mobile screen sizes. Use Chakra UI's responsive style props (e.g., `width={{ base: '100%', md: '50%' }}`) to implement responsive designs.

## 4. Visual Style

*   **Theme**: All colors, fonts, and spacing should adhere to the values defined in the existing Chakra UI theme file (`ui/src/theme.js`). Do not introduce new, one-off colors or font styles.
*   **Icons**: Use the existing SVG icons located in `ui/src/static/images/`. If a new icon is needed, it should match the style of the existing set (Material Design icons).

## 5. Accessibility

*   **Follow Best Practices**: Adhere to web accessibility (a11y) best practices.
*   **Chakra UI's Role**: Chakra UI components are built with accessibility in mind. Use them correctly (e.g., provide `aria-label` props for icon buttons, use `FormControl` for form inputs) to leverage their built-in accessibility features.
*   **Keyboard Navigation**: Ensure all interactive elements are reachable and operable via the keyboard.
