# Coding Guidelines

These guidelines are established to ensure code quality, consistency, and maintainability across the Photonix project, especially when multiple developers or AI assistants are contributing.

## General Principles

*   **Clarity over cleverness**: Write code that is easy to understand and read.
*   **Consistency**: Adhere to the style and patterns of the existing codebase. Before writing new code, take time to read the surrounding files.
*   **Comments**: Add comments to explain *why* a piece of code exists, especially if the logic is complex or non-obvious. Do not comment on *what* the code is doing if it's self-explanatory.

---

## Backend (Python/Django)

*   **Style Guide**: All Python code **must** adhere to the [PEP 8 Style Guide](https://www.python.org/dev/peps/pep-0008/).
*   **Line Length**: Maximum line length is 120 characters.
*   **Import Ordering**: Imports should be grouped in the following order, with each group separated by a blank line:
    1.  Standard library imports (e.g., `os`, `sys`).
    2.  Third-party library imports (e.g., `django`, `celery`).
    3.  Local application (Photonix) imports (e.g., `photonix.photos.models`).
    *   Use a tool like `isort` to automatically format imports if possible.
*   **Docstrings**: All new modules, classes, and functions should have docstrings that explain their purpose. Use the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings) for docstring formatting.
*   **Type Hinting**: Use Python type hints for all new functions and methods to improve code clarity and allow for static analysis.

---

## Frontend (JavaScript/React)

*   **Code Formatter**: All JavaScript/React code **must** be formatted using **Prettier** with its default settings. This ensures a consistent style without debate.
*   **Component Structure**: Follow the existing **Container/Presentational Component** pattern where applicable.
    *   **Containers** (`/src/containers/`): Handle logic, data fetching (GraphQL queries), and state management.
    *   **Presentational Components** (`/src/components/`): Receive data via props and are primarily concerned with rendering the UI. They should be as stateless as possible.
*   **Naming Conventions**:
    *   Components should be named in `PascalCase` (e.g., `PhotoGrid.js`).
    *   Functions and variables should be named in `camelCase` (e.g., `handlePhotoClick`).
*   **CSS**: Use the existing CSS stylesheets and conventions. Avoid inline styles unless absolutely necessary.

---

## Git and Version Control

*   **Commit Messages**: All commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This helps create an explicit commit history that is easy to read and can be used for automated changelog generation.
    *   **Format**: `<type>[optional scope]: <description>`
    *   **Example Types**:
        *   `feat`: A new feature.
        *   `fix`: A bug fix.
        *   `docs`: Documentation only changes.
        *   `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
        *   `refactor`: A code change that neither fixes a bug nor adds a feature.
        *   `test`: Adding missing tests or correcting existing tests.
        *   `chore`: Changes to the build process or auxiliary tools and libraries.
    *   **Example Commit Message**: `feat(photos): add star rating component to detail view`
