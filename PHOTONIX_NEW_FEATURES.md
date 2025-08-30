# Photonix: New Feature Suggestions

This document proposes a list of new features that could be added to Photonix to improve its functionality, address user pain points, and expand its strategic value.

## 1. Core Improvements (Addressing Existing Pain Points)

These features are critical for making the application stable, reliable, and trustworthy.

*   **Job Monitoring Dashboard**:
    *   **Description**: A dedicated page in the UI to provide full visibility into the background processing queue. Users should be able to see pending, in-progress, completed, and failed jobs.
    *   **User Value**: This is the single most important feature to fix the "stuck jobs" problem. It builds user trust by making the system's internal state transparent and manageable. It allows users to diagnose issues and retry failed tasks without needing to touch the database.

*   **System Health Panel**:
    *   **Description**: An admin panel showing the status of core services (PostgreSQL, Redis), disk space usage for photos and thumbnails, and the status of the background worker processes.
    *   **User Value**: Gives users peace of mind and allows them to proactively manage their server resources.

## 2. Feature Enhancements (Building on What's There)

These features improve upon the existing functionality of the application.

*   **Advanced Search**:
    *   **Description**: Enhance the search functionality to allow for complex, structured queries. For example: `camera:"Canon EOS R5" AND lens:"RF 24-70mm"` or `date:2023-01-01...2023-01-31` or `rating:>=4`. This could also include a map interface for geographic searches.
    *   **User Value**: Transforms the application from a simple photo viewer into a powerful database for photographers.

*   **Robust Sharing Capabilities**:
    *   **Description**: Allow users to generate unique links to share photos or albums. Sharing options should include password protection and link expiration dates.
    *   **User Value**: A fundamental feature for any modern photo management application, allowing users to share their memories with others easily and securely.

*   **Video File Support**:
    *   **Description**: Extend the application to support video files. This would include generating thumbnails, extracting metadata (duration, resolution), and allowing playback in the UI.
    *   **User Value**: Many users store photos and videos together. Supporting both would make Photonix a more complete media management solution.

*   **Duplicate File Detection**:
    *   **Description**: A utility that scans the library for duplicate or near-duplicate images (e.g., using perceptual hashing). The UI would then present these duplicates to the user for review and deletion.
    *   **User Value**: Helps users clean up their photo libraries and save significant disk space.

*   **Improved Tag Management UI**:
    *   **Description**: A dedicated settings page for managing the tag list. Users could merge tags (e.g., "puppy" into "dog"), rename tags, and see which tags are most/least used.
    *   **User Value**: Provides power users with more control over their data organization.

## 3. Strategic New Features (Expanding the Vision)

These are larger features that could significantly expand the scope and appeal of Photonix.

*   **Mobile Application (PWA or Native)**:
    *   **Description**: A mobile app for iOS and Android that connects to a user's self-hosted Photonix instance. Key features would include browsing the library and, most importantly, automatic camera roll uploads.
    *   **User Value**: This would make Photonix a viable alternative to commercial services like Google Photos or iCloud Photos.

*   **Cloud Storage Integration (Read-Only)**:
    *   **Description**: Allow users to connect their existing cloud storage accounts (e.g., Google Drive, Dropbox, S3) as a read-only source. Photonix would scan the photos in place, generate thumbnails and AI tags, but would not store a duplicate of the original file.
    *   **User Value**: Massively increases the appeal of Photonix to users who already have large, established collections in the cloud and don't want to migrate them.

*   **Interactive AI Model Training**:
    *   **Description**: Allow users to provide feedback to the AI. For example, if a face is unidentified, the user could assign a name. If an object is misidentified, the user could correct it. This feedback would be used to re-train the local classification models, improving their accuracy over time.
    *   **User Value**: Creates a personalized and ever-improving experience that is unique to the user's own photo collection.
