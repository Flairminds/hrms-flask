---
description: Automatically reviews and updates API documentation for all modules
---

# Automated API Documentation Workflow

This workflow analyzes all routes and controllers to generate comprehensive API documentation.

## Steps

1. **Initialize Documentation Structure**
   - Read the existing `/docs/API_DOCUMENTATION.md` file
   - Create a backup if the file exists
   - Prepare the document structure with module sections

2. **Module-wise API Analysis**
   - For each module in `app/routes/`:
     - Read the route file (e.g., `account.py`, `hr.py`, `leave.py`, etc.)
     - Extract all endpoints with their:
       - HTTP Method (GET, POST, PUT, DELETE)
       - Route path
       - Required roles/permissions
     - Read the corresponding controller file
     - Extract for each endpoint:
       - Request body schema (from `request.get_json()`)
       - Query parameters (from `request.args.get()`)
       - Response format
       - Status codes (200, 400, 403, 404, 500)
       - Error messages

3. **Document Each Endpoint**
   For each endpoint, create documentation with:
   - **Endpoint Name**: Descriptive name
   - **Method**: HTTP verb
   - **Path**: Full route path with parameters
   - **Authentication**: Required roles
   - **Query Parameters**: List with type and description
   - **Request Body**: JSON schema with field types
   - **Response**: Success response structure
   - **Status Codes**: All possible codes with descriptions
   - **Example**: Sample request and response

4. **Group by Module**
   Organize endpoints by functional module:
   - Account & Authentication
   - HR Management
   - Leave Management
   - Document Management
   - Asset Management
   - Feedback & Reviews
   - Skills & Capability
   - Projects & Allocation

5. **Generate Table of Contents**
   - Create a clickable TOC with links to each module
   - Include endpoint count per module

6. **Update API_DOCUMENTATION.md**
   - Replace the contents with the new documentation
   - Preserve any custom notes or warnings
   - Add generation timestamp

7. **Validation**
   - Ensure all routes are documented
   - Check for missing controller methods
   - Verify response format consistency

8. **Completion**
   - Save the updated `/docs/API_DOCUMENTATION.md`
   - Notify the user with a summary of documented endpoints

// turbo
To trigger this workflow, run the `/api-documentation` command.