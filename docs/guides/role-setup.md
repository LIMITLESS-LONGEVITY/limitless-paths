# Role Setup Guide

## Overview

Access to the LIMITLESS PATHS admin panel is controlled by a permission-based role system. Rather than granting individual users specific abilities one by one, you assign each user a **role**. Each role carries a set of **permissions** that determine what the user can see and do.

This approach makes it straightforward to onboard new team members (assign a role, done) and to adjust access across your team (update the role, every user with that role is updated automatically).

Roles and permissions apply across the platform for the organisation they belong to.

---

## All Permissions

The following permissions exist in the system. Each one controls a specific action.

| Permission | Description |
|---|---|
| `articles.create` | Create new articles and edit your own drafts |
| `articles.read` | View articles in the dashboard |
| `articles.update` | Edit any article, regardless of who wrote it |
| `articles.delete` | Permanently delete articles from the platform |
| `articles.submit_review` | Submit articles for editorial review |
| `articles.review` | Approve or reject articles that are in review |
| `articles.publish` | Publish approved articles, archive live articles, and reopen archived ones |
| `pillars.create` | Create new content pillars |
| `pillars.update` | Edit pillar details, reorder pillars, or deactivate them |
| `pillars.delete` | Delete pillars (only possible if no content is linked to them) |

---

## Recommended Role Templates

These four roles cover most team structures. You can use them as-is or adapt them to fit your organisation.

| Role | Best for | Permissions included |
|---|---|---|
| Coach / Author | Content creators who write but do not review or publish | `articles.create`, `articles.read`, `articles.submit_review` |
| Editor | Reviewers who approve content but do not control publishing | `articles.create`, `articles.read`, `articles.update`, `articles.submit_review`, `articles.review` |
| Publisher | Full content lifecycle management from writing to going live | `articles.create`, `articles.read`, `articles.update`, `articles.submit_review`, `articles.review`, `articles.publish` |
| Admin | Platform administrators with unrestricted access | All permissions |

**Important:** Avoid giving the Publisher or Admin role to users who only need to write. Limiting permissions to what each person actually needs keeps the platform safe and reduces the risk of accidental publishing.

---

## How to Set Up a Role

Follow these steps to create a new role or edit an existing one:

1. Go to the admin panel at `admin.your-domain.com` and sign in.
2. In the left sidebar, navigate to **Org Settings**, then select **Roles**.
3. To create a new role, click **+ New Role** and give it a name and optional description. To edit an existing role, click its name.
4. Scroll to the **Articles** permissions section.
5. Toggle each permission on or off according to what you want users in this role to be able to do.
6. If you are also managing pillar access, scroll to the **Pillars** section and configure those permissions.
7. Click **Save**.
8. To assign the role to a user: navigate to **Org Settings > Members**, find the user, click **Edit**, and select the appropriate role from the dropdown.

Changes take effect immediately. Users with an active session will see updated permissions without needing to log out.

---

## Common Scenarios

**"I want coaches to write content but not review or publish it."**
Use the Coach / Author role. Coaches can create articles, see the dashboard, and submit for review. They cannot approve, reject, or publish anything.

**"I want one dedicated person to review all content before it goes live."**
Use the Editor role. Editors can approve or reject articles in the review queue. They cannot publish — that step still requires a Publisher or Admin.

**"I want full control over what goes live and when."**
Use the Publisher role for the person managing the publication calendar. Publishers can move articles through every stage of the workflow, including the final publish and archive steps.

**"I need to give someone access to manage pillars but not articles."**
Create a custom role with only `pillars.create`, `pillars.update`, and `articles.read`. This lets them manage the content taxonomy without touching article content.

**"A team member left. How do I remove their access?"**
Navigate to **Org Settings > Members**, find the user, and either remove them from the organisation or change their role to one with minimal permissions (such as a read-only custom role). Removing a user from the organisation revokes all access immediately.
