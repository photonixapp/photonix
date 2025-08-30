# Photonix UI/UX Design Document

This document outlines the user interface (UI) design, user experience (UX), and key user flows of the Photonix application, based on a static analysis of the React frontend codebase.

## 1. Overall Design Philosophy

The Photonix UI is designed as a Single-Page Application (SPA). The core UX principle is centered around a main **Browse View**, with most other interactions and views opening as **modals** on top of it. This creates a focused user experience where the photo collection is always the primary context.

The application uses the **Chakra UI** component library, which suggests a design that favors clean, modern, and accessible components.

## 2. Key Components and Screens

The UI is built from a set of reusable React components. The main screens are defined by the application's routing structure.

### Main View

*   **Component**: `BrowseContainer` (`/`)
*   **Description**: This is the main screen of the application for authenticated users. It is responsible for displaying the user's photo collection. Based on the components it likely contains, this view includes:
    *   A `Header` with navigation and search controls.
    *   A `Filters` sidebar or panel to narrow down the photos by tags, dates, etc.
    *   A `PhotoList` component that displays the photos as a grid of `Thumbnail`s, likely with infinite scrolling (`InfiniteScroll` component).
    *   A `MapView` component, suggesting a way to view photos geographically.

### Modal Views

These views open as overlays on top of the Browse View.

*   **Login**: (`/login`)
    *   **Component**: `Login`
    *   **Description**: A standard login form for user authentication. This is the entry point for all users.

*   **Photo Detail**: (`/photo/:photoId`)
    *   **Component**: `PhotoDetailContainer`
    *   **Description**: Displays a single, high-resolution photo (`ZoomableImage`). It also shows detailed information about the photo, including:
        *   `PhotoMetadata` (EXIF data like camera, aperture, ISO).
        *   `EditableTags` for viewing and managing tags.
        *   `ColorTags` showing the results of color analysis.
        *   `BoundingBoxes` to highlight detected faces or objects.
        *   A `StarRating` component.

*   **Onboarding**: (`/onboarding`)
    *   **Component**: `Onboarding`
    *   **Description**: A multi-step wizard to guide new users through the initial setup of the application. The steps include creating an admin user, creating a library, and configuring photo importing.

*   **Settings**: (`/settings`)
    *   **Component**: `Settings`
    *   **Description**: A modal for configuring application-level settings.

*   **Account**: (`/account`)
    *   **Component**: `Account`
    *   **Description**: A modal for managing user-specific account information.

## 3. User Interaction Flows

### a. First-Time User Experience (Onboarding)

1.  User is directed to the `/login` page.
2.  Upon first login, the application likely redirects them to the `/onboarding` modal.
3.  The user follows a series of steps to create a library and configure the photo import path.
4.  After completing onboarding, they are taken to the main `BrowseContainer` view, which will start populating with photos as they are processed in the background.

### b. Core User Experience (Browsing and Viewing)

1.  A returning user logs in and lands on the `BrowseContainer` (`/`).
2.  They see a grid of their photos. They can scroll down to load more photos infinitely.
3.  They can use the `SearchInput` in the header or the `Filters` panel to find specific photos.
4.  Clicking on a thumbnail opens the `PhotoDetailContainer` in a modal (`/photo/:photoId`), displaying the photo and its metadata.
5.  Within the detail modal, the user can rate the photo, add/remove tags, and view AI-generated data.
6.  Closing the modal returns them to their position in the main browse grid.

### c. Known UI Bugs/Issues from Code Analysis

*   **Malformed Album Route**: The route defined in `App.js` for `AlbumList` is `?mode=albums&album_id=:albumId`. This is not a valid `react-router-dom` path and will not work as intended. This part of the UI is likely broken.

## 4. State Management

*   The application uses **Redux** for global state management.
*   Separate stores are maintained for different parts of the application state (`layout`, `libraries`, `photos`, `tag`, `user`), which is a good practice for organization.
*   **Apollo Client** also manages its own internal cache for GraphQL query results, which acts as another layer of client-side state.
