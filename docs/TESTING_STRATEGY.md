# Proposed Testing Strategy for Photonix

A robust testing strategy is essential to "maintain sanity" during a major refactoring project and to ensure the long-term quality of the application. Here is the recommended multi-layered strategy for Photonix.

## 1. Unit Tests (The Foundation)

*   **Purpose**: To verify that individual, isolated pieces of code (a single function or a single React component) work correctly. These tests are fast and should be run constantly during development.
*   **Backend (PyTest)**:
    *   Every new utility function must have unit tests.
    *   For Celery tasks, the core business logic of the task should be encapsulated in a separate, pure function that can be unit-tested easily without involving the Celery framework itself.
*   **Frontend (Jest & React Testing Library)**:
    *   Every new React component should have a basic test to ensure it renders correctly without crashing.
    *   Components with complex internal logic or user interactions should have their behavior tested thoroughly.

## 2. Integration Tests (The Most Important Layer)

*   **Purpose**: To verify that different parts of the system work together correctly. This is the **most critical area for improvement** and the key to ensuring the refactoring is successful.
*   **Backend (PyTest + Celery)**:
    *   **Strategy**: We must create integration tests for the entire photo processing pipeline.
    *   **Implementation**: A test would programmatically create a `Photo` object in a test database, dispatch the Celery task chain, and then use Celery's testing tools (which can run tasks synchronously and locally) to execute the pipeline. The test would then assert that the photo was processed correctly and that the expected tags were created in the database.
    *   **Benefit**: This provides a powerful safety net, allowing developers to refactor the entire pipeline with confidence, knowing that they have not broken the core logic.
*   **Frontend (Jest + Apollo MockedProvider)**:
    *   **Strategy**: We need to test that our React components correctly query and display data from the GraphQL API.
    *   **Implementation**: This can be done by using `MockedProvider` from Apollo Client to simulate the GraphQL backend. This allows us to test the frontend's data handling and rendering logic in isolation, without needing a running backend.

## 3. End-to-End (E2E) Tests (The Final Check)

*   **Purpose**: To simulate a real user interacting with the complete, running application in a browser. These tests are the ultimate guarantee that the system works as a whole.
*   **Technology**: I recommend introducing a modern E2E framework like **Playwright** or **Cypress**.
*   **Example Test Case**:
    1.  The test script would start the entire application using Docker Compose.
    2.  It would control a real browser to navigate to the site and log in.
    3.  It would simulate a photo upload.
    4.  It would wait and poll the UI until the photo appears in the grid.
    5.  It would click on the photo and assert that the detail view opens and shows the correct, AI-generated tags.
*   **Usage**: E2E tests are slow and can be brittle. They should be used sparingly to cover only the most critical user flows (the "happy paths").

## Continuous Integration (CI)

*   **Strategy**: All of these tests (especially Unit and Integration) **must** be run automatically via **GitHub Actions** on every single pull request.
*   **Rule**: No new code should be merged into the main branch unless all tests pass. This is non-negotiable for maintaining a healthy codebase.
