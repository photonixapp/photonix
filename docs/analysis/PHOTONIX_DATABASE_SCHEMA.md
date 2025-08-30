# Photonix Database Schema

This document provides an overview of the Photonix database schema, based on an analysis of the Django models.

## Base Models

Most models in the database inherit from two abstract base models:

*   **`UUIDModel`**: Replaces the default auto-incrementing integer primary key with a non-editable `UUIDField`.
*   **`VersionedModel`**: Adds two automatically managed timestamp fields: `created_at` and `updated_at`.

---

## Accounts App (`accounts.models`)

### `User`
Inherits from Django's `AbstractUser`, `UUIDModel`, and `VersionedModel`. This table stores user information.

*   **id (UUID, PK)**: Primary Key.
*   **username (CharField)**: User's username.
*   **password (CharField)**: Hashed password.
*   **email (EmailField)**: User's email address.
*   **first_name (CharField)**
*   **last_name (CharField)**
*   **is_staff (BooleanField)**
*   **is_active (BooleanField)**
*   **is_superuser (BooleanField)**
*   **date_joined (DateTimeField)**
*   **last_login (DateTimeField)**
*   **has_set_personal_info (BooleanField)**: Flag to track setup progress.
*   **has_created_library (BooleanField)**: Flag to track setup progress.
*   **has_configured_importing (BooleanField)**: Flag to track setup progress.
*   **has_configured_image_analysis (BooleanField)**: Flag to track setup progress.

---

## Photos App (`photos.models`)

### `Library`
Represents a user's photo library and its settings.

*   **id (UUID, PK)**
*   **name (CharField)**: Display name of the library.
*   **classification_*_enabled (BooleanField)**: A set of flags to enable/disable different AI-based analyses (color, location, style, object, face).
*   **Relationships**:
    *   Has many `LibraryPath`s.
    *   Has many `LibraryUser`s.
    *   Has many `Photo`s.
    *   Has many `Tag`s.
    *   Has many `Camera`s and `Lens`es.

### `LibraryPath`
Defines a storage location for a `Library`.

*   **id (UUID, PK)**
*   **path (CharField)**: The physical path (e.g., `/photos/`) or S3 bucket name.
*   **type (CharField)**: Type of path (Store, Import only, Thumbnails).
*   **backend_type (CharField)**: Type of storage (Local, S3).
*   ... and other configuration fields like S3 credentials.
*   **Relationships**:
    *   Belongs to one `Library` (ForeignKey).

### `LibraryUser`
Links users to libraries, defining ownership.

*   **id (UUID, PK)**
*   **owner (BooleanField)**
*   **Relationships**:
    *   Belongs to one `Library` (ForeignKey).
    *   Belongs to one `User` (ForeignKey).
    *   *Constraint*: `unique_together` on `library` and `user`.

### `Photo`
The central model representing a single image and its metadata.

*   **id (UUID, PK)**
*   **taken_at (DateTimeField)**: EXIF creation date.
*   **latitude (DecimalField)**, **longitude (DecimalField)**, **altitude (DecimalField)**: GPS coordinates.
*   **star_rating (PositiveIntegerField)**
*   ... and many other fields for EXIF metadata (aperture, exposure, etc.).
*   **Relationships**:
    *   Belongs to one `Library` (ForeignKey).
    *   Belongs to one `Camera` (ForeignKey, nullable).
    *   Belongs to one `Lens` (ForeignKey, nullable).
    *   Has one `preferred_photo_file` (ForeignKey to `PhotoFile`, nullable).
    *   Has many `PhotoFile`s.
    *   Has many `PhotoTag`s (linking to `Tag`s).

### `PhotoFile`
Represents a single physical file for a `Photo`.

*   **id (UUID, PK)**
*   **path (CharField)**: Full path to the file on disk.
*   **width (PositiveIntegerField)**, **height (PositiveIntegerField)**
*   **mimetype (CharField)**
*   **bytes (PositiveIntegerField)**
*   **raw_processed (BooleanField)**: Flag indicating if the RAW file has been processed.
*   **Relationships**:
    *   Belongs to one `Photo` (ForeignKey).

### `Tag`
A hierarchical tag that can be applied to photos.

*   **id (UUID, PK)**
*   **name (CharField)**: The name of the tag (e.g., "blue", "dog", "beach").
*   **type (CharField)**: The type of tag (Album, Color, Event, Face, Generic, Location, Object, Style).
*   **source (CharField)**: Who created the tag (Computer or Human).
*   **Relationships**:
    *   Belongs to one `Library` (ForeignKey).
    *   Can have one `parent` `Tag` (self-referencing ForeignKey, nullable).
    *   Has many `PhotoTag`s (linking to `Photo`s).

### `PhotoTag`
The join table between `Photo` and `Tag`.

*   **id (UUID, PK)**
*   **confidence (FloatField)**: Confidence score from the ML model.
*   **position_x, position_y, size_x, size_y (FloatField)**: Bounding box coordinates for face/object detection.
*   **verified (BooleanField)**, **hidden (BooleanField)**: Flags for user curation.
*   **Relationships**:
    *   Belongs to one `Photo` (ForeignKey).
    *   Belongs to one `Tag` (ForeignKey).

### `Task`
A model used to track the state of background jobs. This is the core of the custom job queue system.

*   **id (UUID, PK)**
*   **type (CharField)**: The name of the task to be performed (e.g., `classification_object_processor`).
*   **subject_id (UUIDField)**: The ID of the object this task operates on (e.g., a `Photo` ID).
*   **status (CharField)**: The current status of the task (Pending, Started, Completed, Failed).
*   **started_at (DateTimeField)**, **finished_at (DateTimeField)**
*   **Relationships**:
    *   Can have one `parent` `Task` (self-referencing ForeignKey, nullable), allowing for task chaining.
    *   Belongs to one `Library` (ForeignKey, nullable).
